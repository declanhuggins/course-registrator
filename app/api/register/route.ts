import { NextResponse } from 'next/server';
import { loginIntoSite, registerWithPlan, registerWithCrns } from '@/lib/register';

export async function POST(req: Request) {
  try {
    const { term, crns } = await req.json();
    if (!term) {
      return NextResponse.json({ message: 'Term is required' }, { status: 400 });
    }

    const driver = await loginIntoSite();

    if (crns && Array.isArray(crns) && crns.length > 0) {
      await registerWithCrns(driver, term, crns);
      await driver.sleep(10000);
      await driver.quit();
      return NextResponse.json({ message: 'CRNs registered successfully' });
    } else {
      await registerWithPlan(driver, term);
      await driver.sleep(10000);
      await driver.quit();
      return NextResponse.json({ message: 'Plan registered successfully' });
    }
  } catch (err) {
    console.error('Error in registration API:', err);
    return NextResponse.json({ message: 'Registration failed' }, { status: 500 });
  }
}