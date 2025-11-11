// components/LoginForm.jsx
export default function LoginForm() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md p-6 bg-card rounded-lg border border-border shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-card-foreground">SLF One Manager</h1>
          <p className="text-muted-foreground mt-2">Masuk ke akun Anda</p>
        </div>

        {/* Form */}
        <form className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              defaultValue="head-consultant@slf.com"
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Masukkan password"
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Login
          </button>

          {/* Forgot Password */}
          <div className="text-center">
            <button
              type="button"
              className="text-primary text-sm hover:text-primary/80"
            >
              Lupa Password? Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}