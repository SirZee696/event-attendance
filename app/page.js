import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20 text-center">
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-900">
          Welcome to Event Attendance
        </h1>

        <p className="mt-4 text-lg sm:text-xl text-gray-600">
          Your one-stop solution for managing event attendance.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link
            href="/login"
            className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 font-semibold text-blue-600 bg-transparent border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </main>
    </div>
  );
}
