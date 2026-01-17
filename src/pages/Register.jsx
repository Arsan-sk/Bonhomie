import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

// Configuration for dynamic fields mapping
const SCHOOL_CONFIG = {
  SOP: {
    program: "Pharmacy",
    departments: ["Diploma Pharmacy", "Degree Pharmacy"],
    years: ["1", "2", "3", "4"],
  },
  SOET: {
    program: "Engineering",
    departments: ["CO", "AIML", "DS", "ECS", "CE", "ME", "ECE", "EE", "BSC IT"],
    years: ["1", "2", "3", "4"],
  },
  SOA: {
    program: "Architecture",
    departments: ["Diploma Architecture", "Degree Architecture"],
    years: ["1", "2", "3", "4", "5"],
  },
};

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Full name is required"),
    email: z
      .string()
      .email("Invalid email address")
      .refine(email => email.endsWith("@aiktc.ac.in") || email.endsWith("@bonhomie.com"), {
        message: "Email must be from @aiktc.ac.in or @bonhomie.com domain",
      }),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    roll_number: z.string().min(1, "Roll number is required"),
    school: z.enum(["SOP", "SOET", "SOA"], { required_error: "School is required" }),
    department: z.string().min(1, "Department is required"),
    program: z.string().min(1, "Program is required"),
    year_of_study: z.string().min(1, "Year of study is required"),
    admission_year: z.string().min(4, "Admission year is required"),
    expected_passout_year: z.string().min(4, "Expected passout year is required"),
    phone: z.string().min(10, "Valid phone number is required"),
    gender: z.enum(["Male", "Female", "Other"], { required_error: "Gender is required" }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      school: "",
      department: "",
      year_of_study: "",
      program: "",
    },
  });

  // Watch the school field to update other dropdowns
  const selectedSchool = watch("school");

  // Logic: Reset and Update dependent fields when school changes
  useEffect(() => {
    if (selectedSchool) {
      // Automatically set the program based on school
      setValue("program", SCHOOL_CONFIG[selectedSchool].program);
      // Clear previous selections to force user to pick from new list
      setValue("department", "");
      setValue("year_of_study", "");
    } else {
      setValue("program", "");
    }
  }, [selectedSchool, setValue]);

  const onSubmit = async data => {
    setIsLoading(true);
    setError("");
    try {
      const { full_name, email, password, confirmPassword, ...profileData } = data;

      const { data: authData, error: authError } = await signUp(email, password, {
        full_name,
        role: "student",
        ...profileData,
      });

      if (authError) throw authError;
      navigate("/");
    } catch (err) {
      console.error("Registration error:", err);
      let errorMessage = "Registration failed. Please try again.";
      const errorText = err.message?.toLowerCase() || "";

      if (errorText.includes("email already registered")) {
        errorMessage = "❌ This email is already registered.";
      } else if (errorText.includes("roll number already registered")) {
        errorMessage = "❌ This roll number is already registered.";
      } else if (err.message && err.message.length < 150) {
        errorMessage = `❌ ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Create your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[600px]">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900">Full Name</label>
              <input
                type="text"
                {...register("full_name")}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900">Email</label>
              <input
                type="email"
                {...register("email")}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-900">Password</label>
              <input
                type="password"
                {...register("password")}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">Confirm Password</label>
              <input
                type="password"
                {...register("confirmPassword")}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* School Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900">School</label>
              <select
                {...register("school")}
                className="mt-2 block w-full rounded-md border-0 py-2 px-3 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary"
              >
                <option value="">Select School</option>
                <option value="SOP">SoP (Pharmacy)</option>
                <option value="SOET">SoET (Engineering)</option>
                <option value="SOA">SoA (Architecture)</option>
              </select>
              {errors.school && (
                <p className="mt-1 text-sm text-red-600">{errors.school.message}</p>
              )}
            </div>

            {/* Program - Auto-populated or Filtered */}
            <div>
              <label className="block text-sm font-medium text-gray-900">Program</label>
              <input
                type="text"
                readOnly
                {...register("program")}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-300 cursor-not-allowed"
                placeholder="Select school first"
              />
            </div>

            {/* Dynamic Department Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900">Department</label>
              <select
                {...register("department")}
                disabled={!selectedSchool}
                className="mt-2 block w-full rounded-md border-0 py-2 px-3 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              >
                <option value="">Select Department</option>
                {selectedSchool &&
                  SCHOOL_CONFIG[selectedSchool].departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>

            {/* Dynamic Year of Study */}
            <div>
              <label className="block text-sm font-medium text-gray-900">Year of Study</label>
              <select
                {...register("year_of_study")}
                disabled={!selectedSchool}
                className="mt-2 block w-full rounded-md border-0 py-2 px-3 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              >
                <option value="">Select Year</option>
                {selectedSchool &&
                  SCHOOL_CONFIG[selectedSchool].years.map(year => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
              </select>
              {errors.year_of_study && (
                <p className="mt-1 text-sm text-red-600">{errors.year_of_study.message}</p>
              )}
            </div>

            {/* Remaining Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-900">Roll Number</label>
              <input
                type="text"
                {...register("roll_number")}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary"
              />
              {errors.roll_number && (
                <p className="mt-1 text-sm text-red-600">{errors.roll_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">Phone</label>
              <input
                type="tel"
                {...register("phone")}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">Admission Year</label>
              <input
                type="text"
                {...register("admission_year")}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 ring-1 ring-inset ring-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">Expected Passout</label>
              <input
                type="text"
                {...register("expected_passout_year")}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 ring-1 ring-inset ring-gray-300"
              />
            </div>

            {/* Gender */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900">Gender</label>
              <div className="mt-2 flex space-x-6">
                {["Male", "Female", "Other"].map(g => (
                  <div key={g} className="flex items-center gap-x-3">
                    <input
                      type="radio"
                      value={g}
                      {...register("gender")}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <label className="text-sm font-medium text-gray-900">{g}</label>
                  </div>
                ))}
              </div>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm font-medium text-red-800">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
