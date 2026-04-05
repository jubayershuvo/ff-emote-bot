import { generate, verify } from "otplib";

const SECRET = process.env.NEXT_PUBLIC_OTP_SECRET as string;

if (!SECRET) {
  throw new Error("OTP_SECRET is not defined in environment variables");
}

/**
 * Generate OTP using ENV secret
 */
export const generateOTP = async (): Promise<string> => {
  return await generate({ secret: SECRET });
};

/**
 * Verify OTP using ENV secret
 */
export const verifyOTP = async (token: string): Promise<boolean> => {
  try {
    const result = await verify({ secret: SECRET, token });
    return result.valid;
  } catch (error) {
    console.error("Error occurred while verifying OTP:", error);
    return false;
  }
};