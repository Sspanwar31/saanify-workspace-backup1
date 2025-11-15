'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Key, Mail, Lock, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

export default function SetupPage() {
  const [formData, setFormData] = useState({
    setupKey: '',
    superadminEmail: '',
    superadminPassword: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.setupKey.trim()) { setError('Setup key is required'); return false }
    if (!formData.superadminEmail.trim()) { setError('Superadmin email is required'); return false }
    if (!formData.superadminPassword.trim()) { setError('Superadmin password is required'); return false }
    if (formData.superadminPassword.length < 8) { setError(
