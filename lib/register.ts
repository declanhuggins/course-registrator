export const runtime = 'edge';

import { Builder, By, Key, until } from 'selenium-webdriver';
import type { WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import dotenv from 'dotenv';
import { authenticator } from 'otplib';
import { ServiceBuilder } from 'selenium-webdriver/chrome';

dotenv.config();

async function buildDriver(): Promise<WebDriver> {
  const service = new ServiceBuilder('/opt/homebrew/bin/chromedriver');
  const options = new chrome.Options()
    .addArguments('--disable-gpu', '--window-size=1920,1080', '--incognito');
  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options as chrome.Options)
    .setChromeService(service)
    .build();
}

export async function performLogin(driver: WebDriver): Promise<void> {
  await driver.wait(until.elementLocated(By.css('input[name="identifier"]')), 10000);
  await driver.findElement(By.css('input[name="identifier"]')).sendKeys(process.env.OKTA_USER!);
  await driver.findElement(By.css('input[type="submit"][value="Next"]')).click();
  await driver.sleep(3000);
  await driver.wait(until.elementLocated(By.css('input[name="credentials.passcode"]')), 15000);
  await driver.findElement(By.css('input[name="credentials.passcode"]')).sendKeys(process.env.OKTA_PASS!);
  const passwordSubmit = await driver.wait(until.elementLocated(By.css('input[type="submit"][value="Verify"]')), 10000);
  await passwordSubmit.click();
  const otp = authenticator.generate(process.env.OTP_SECRET!);
  await driver.wait(until.elementLocated(By.css('input[type="text"][name="credentials.passcode"]')), 15000);
  await driver.findElement(By.css('input[type="text"][name="credentials.passcode"]')).sendKeys(otp);
  await driver.findElement(By.css('input[type="submit"][value="Verify"]')).click();
  try {
    const noStaySignedIn = await driver.wait(
      until.elementLocated(By.css('a[data-se="do-not-stay-signed-in-btn"]')),
      10000
    );
    await driver.sleep(1000);
    await driver.executeScript('arguments[0].click()', noStaySignedIn);
    await driver.sleep(3000);
  } catch {
    console.warn('Stay signed in prompt not found; continuing.');
  }
  console.info('Login complete');
}

export async function loginIntoSite(): Promise<WebDriver> {
  const driver = await buildDriver();
  await driver.get('https://bxeregprod.oit.nd.edu/StudentRegistration/ssb/registration');
  const addDropLink = await driver.wait(
    until.elementLocated(By.css('a#registerLink')),
    10000
  );
  await driver.executeScript('arguments[0].click()', addDropLink);
  await driver.wait(until.urlMatches(/login\.nd\.edu|okta|sso/), 10000);
  await performLogin(driver);
  console.info('Login and 2FA successful');
  return driver;
}

async function selectTerm(driver: WebDriver, term: string) {
  const dropdownToggle = await driver.wait(
    until.elementLocated(By.css('#s2id_txt_term .select2-choice')),
    10000
  );
  await driver.executeScript('arguments[0].scrollIntoView(true)', dropdownToggle);
  await dropdownToggle.click();
  await driver.sleep(1000);
  const termOption = await driver.wait(
    until.elementLocated(By.xpath(`//div[text()="${term}"]`)),
    10000
  );
  await driver.executeScript('arguments[0].scrollIntoView(true)', termOption);
  await termOption.click();
  await driver.actions().sendKeys(Key.ESCAPE).perform();
  await driver.sleep(1000);
}

export async function registerWithPlan(driver: WebDriver, term: string) {
  try {
    await driver.get('https://bxeregprod.oit.nd.edu/StudentRegistration/ssb/term/termSelection?mode=registration');
    console.info('Navigated to term selection page');
    console.info('Beginning plan registration process');
    await selectTerm(driver, term);
    await driver.wait(until.elementLocated(By.id('term-go')), 10000);
    await driver.findElement(By.id('term-go')).click();
    await driver.wait(until.elementLocated(By.id('loadPlans-tab')), 10000);
    await driver.findElement(By.id('loadPlans-tab')).click();
    try {
      const addAllBtn = await driver.wait(
        until.elementLocated(By.xpath("//button[normalize-space(text())='Add All']")),
        10000
      );
      await driver.executeScript('arguments[0].scrollIntoView(true);', addAllBtn);
      await driver.sleep(500);
      await driver.executeScript('arguments[0].click();', addAllBtn);
      console.info('Clicked "Add All" button');
      await submitRegistration(driver);
    } catch (e) {
      console.error('Could not click "Add All" button; page source follows:');
      console.log(await driver.getPageSource());
      throw e;
    }
    console.info(`Plan registration for ${term} submitted`);
  } catch (err) {
    console.error('❌ Error during automation:', err);
  }
}

export async function registerWithCrns(driver: WebDriver, term: string, crns: string[]) {
  try {
    await driver.get('https://bxeregprod.oit.nd.edu/StudentRegistration/ssb/term/termSelection?mode=registration');
    console.info('Navigated to term selection page');
    console.info('Beginning CRN registration process');
    await selectTerm(driver, term);
    await driver.wait(until.elementLocated(By.id('term-go')), 10000);
    await driver.findElement(By.id('term-go')).click();
    await driver.wait(until.elementLocated(By.id('enterCRNs-tab')), 10000);
    await driver.findElement(By.id('enterCRNs-tab')).click();
    for (let i = 0; i < crns.length; i++) {
      const idx = i + 1;
      await driver.wait(until.elementLocated(By.id(`txt_crn${idx}`)), 5000);
      const input = await driver.findElement(By.id(`txt_crn${idx}`));
      await input.clear();
      await input.sendKeys(crns[i]);
      await driver.findElement(By.id('addAnotherCRN')).click();
      await driver.sleep(500);
    }
    await driver.findElement(By.id('addCRNbutton')).click();
    console.info(`CRNs [${crns.join(', ')}] submitted for term ${term}`);
    await submitRegistration(driver);
  } catch (err) {
    console.error('Error during CRN registration:', err);
  }
}

async function submitRegistration(driver: WebDriver): Promise<void> {
  // Tick the conditional add/drop checkbox
  const checkbox = await driver.wait(
    until.elementLocated(By.css('input.button-bar-input#conditionalAddDrop')),
    10000
  );
  await driver.executeScript('arguments[0].scrollIntoView(true)', checkbox);
  await checkbox.click();

  // Click the Submit button
  const submitBtn = await driver.wait(
    until.elementLocated(By.css('button#saveButton')),
    10000
  );
  await driver.executeScript('arguments[0].scrollIntoView(true)', submitBtn);
  await submitBtn.click();
  await driver.sleep(1000);
  console.info('Registration submitted');
}