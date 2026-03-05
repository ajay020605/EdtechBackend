import { Router } from "express";
import {
  requestTeacherAccess,
  requestStudentSignupOTP,
  verifyStudentSignupOTP,
  requestTeacherSignupOTP,
  verifyTeacherSignupOTP,
  loginUser,
  requestPasswordResetOTP,
  verifyPasswordResetOTP
} from "../controllers/auth.controller";

const router = Router();

/* Teacher Access */
router.post("/teacher/request-access", requestTeacherAccess);

/* Student Signup */
router.post("/student/request-otp", requestStudentSignupOTP);
router.post("/student/verify-otp", verifyStudentSignupOTP);

/* Teacher Signup */
router.post("/teacher/request-otp", requestTeacherSignupOTP);
router.post("/teacher/verify-otp", verifyTeacherSignupOTP);

/* Login */
router.post("/login", loginUser);

/* Password Reset */
router.post("/password/request-otp", requestPasswordResetOTP);
router.post("/password/verify-otp", verifyPasswordResetOTP);

export default router;