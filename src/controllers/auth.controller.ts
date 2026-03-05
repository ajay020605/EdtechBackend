import { Request, Response } from "express";
import prisma from "../prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { generateOTP } from "../utils/otp";
import { sendEmail } from "../utils/sendEmail";

/* ---------------- TEACHER ACCESS REQUEST ---------------- */

export const requestTeacherAccess = async (req: Request, res: Response) => {
  try {
    const { fullName, email } = req.body;

    if (!process.env.ADMIN_EMAIL) {
      throw new Error("ADMIN_EMAIL not configured");
    }

    const inviteKey = crypto.randomBytes(16).toString("hex");

    await prisma.teacherInvite.create({
      data: {
        key: inviteKey,
        teacherEmail: email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "Teacher Signup Request",
      text: `Teacher Signup Request

Name: ${fullName}
Email: ${email}

Invite Key: ${inviteKey}`,
    });

    res.json({ message: "Request sent to admin" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- STUDENT OTP REQUEST ---------------- */

export const requestStudentSignupOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) return res.status(400).json({ message: "User already exists" });

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    await prisma.emailOTP.create({
      data: {
        email,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail({
      to: email,
      subject: "Signup OTP",
      text: `Your OTP is ${otp}`,
    });

    res.json({ message: "OTP sent" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

/* ---------------- STUDENT VERIFY OTP ---------------- */

export const verifyStudentSignupOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, fullName, username, password } = req.body;

    const record = await prisma.emailOTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return res.status(400).json({ message: "OTP not found" });

    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const valid = await bcrypt.compare(otp, record.otpHash);

    if (!valid) return res.status(400).json({ message: "Invalid OTP" });

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername)
      return res.status(400).json({ message: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        username,
        password: hashedPassword,
        role: "STUDENT",
        isEmailVerified: true,
      },
    });

    await prisma.emailOTP.delete({
      where: { id: record.id },
    });

    res.json({ message: "Signup successful", user });
  } catch (error) {
    res.status(500).json({ error });
  }
};

/* ---------------- TEACHER OTP REQUEST ---------------- */

export const requestTeacherSignupOTP = async (req: Request, res: Response) => {
  try {
    const { email, inviteKey } = req.body;

    const invite = await prisma.teacherInvite.findUnique({
      where: { key: inviteKey },
    });

    if (!invite || invite.isUsed)
      return res.status(400).json({ message: "Invalid invite key" });

    if (invite.teacherEmail !== email)
      return res.status(403).json({
        message: "Invite not valid for this email",
      });

    if (invite.expiresAt < new Date())
      return res.status(400).json({ message: "Invite expired" });

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    await prisma.emailOTP.create({
      data: {
        email,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail({
      to: email,
      subject: "Teacher Signup OTP",
      text: `Your OTP is ${otp}`,
    });

    res.json({ message: "OTP sent" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

/* ---------------- TEACHER VERIFY OTP ---------------- */

export const verifyTeacherSignupOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, password, username, fullName, inviteKey } = req.body;

    const record = await prisma.emailOTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return res.status(400).json({ message: "OTP not found" });

    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const valid = await bcrypt.compare(otp, record.otpHash);

    if (!valid) return res.status(400).json({ message: "Invalid OTP" });

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername)
      return res.status(400).json({ message: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        username,
        password: hashedPassword,
        role: "TEACHER",
        isEmailVerified: true,
      },
    });

    await prisma.teacherInvite.update({
      where: { key: inviteKey },
      data: { isUsed: true },
    });

    await prisma.emailOTP.delete({
      where: { id: record.id },
    });

    res.json({ message: "Teacher account created", user });
  } catch (error) {
    res.status(500).json({ error });
  }
};

/* ---------------- LOGIN ---------------- */

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);

    if (!valid)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error });
  }
};

/* ---------------- PASSWORD RESET REQUEST ---------------- */

export const requestPasswordResetOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    await prisma.emailOTP.create({
      data: {
        email,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail({
      to: email,
      subject: "Password Reset OTP",
      text: `Your password reset OTP is ${otp}`,
    });

    res.json({ message: "OTP sent" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

/* ---------------- PASSWORD RESET VERIFY ---------------- */

export const verifyPasswordResetOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    const record = await prisma.emailOTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return res.status(400).json({ message: "OTP not found" });

    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const valid = await bcrypt.compare(otp, record.otpHash);

    if (!valid) return res.status(400).json({ message: "Invalid OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await prisma.emailOTP.delete({
      where: { id: record.id },
    });

    res.json({ message: "Password updated" });
  } catch (error) {
    res.status(500).json({ error });
  }
};