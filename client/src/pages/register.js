import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signIn } from '../utils/auth';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    role: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Validasi Password
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    try {
      // 2. MIGRASI UTAMA: Ganti axios.post dengan signUp Supabase
      await signIn(
        formData.email,
        formData.password,
        formData.name,
        formData.role
      );

      toast({
        title: 'Registration Successful',
        description: 'Account created. Please login with your credentials.',
        variant: 'default'
      });

      router.push('/login');
    } catch (error) {
      // Menangani error dari Supabase, misal email sudah terdaftar
      const errorMessage = error.message.includes('already exists')
                         ? 'Registration failed: This email is already registered.'
                         : error.message || 'Failed to register user.';
        
      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-[500px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-900">
            SLF One Manager
          </CardTitle>
          <CardDescription className="text-slate-600">
            Create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Kolom Name dipetakan ke full_name di profiles */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Kolom Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Kolom Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Kolom Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {/* Catatan: phone dan company saat ini diabaikan oleh fungsi signUp, 
                  tapi biarkan formnya tetap ada jika Anda ingin menambahkannya nanti
                  ke tabel profiles. */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Enter your company name"
                />
              </div>

              {/* Kolom Role dipetakan ke role di profiles (ENUM) */}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleSelectChange('role', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Pastikan options ini sesuai dengan ENUM app_role di Supabase */}
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                    <SelectItem value="head_consultant">Head Consultant</SelectItem>
                    <SelectItem value="project_lead">Project Lead</SelectItem>
                    <SelectItem value="admin_lead">Admin Lead</SelectItem>
                    <SelectItem value="inspektor">Inspector</SelectItem>
                    <SelectItem value="drafter">Drafter</SelectItem>
                    <SelectItem value="klien">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-500 hover:text-blue-700">
                Login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
