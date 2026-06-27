import { createFileRoute } from '@tanstack/react-router'
import { PhoneAuthForm } from '@/features/auth/components/phone-auth-form'
import { redirectIfAuthed } from '@/routes/__root'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export const Route = createFileRoute('/register')({
  beforeLoad: redirectIfAuthed,
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mb-6 flex justify-end">
        <ThemeToggle />
      </div>
      <PhoneAuthForm
        purpose="register"
        title="Регистрация"
        description="Создайте аккаунт по номеру телефона"
        alternateLink={{ to: '/login', label: 'Уже есть аккаунт? Войти' }}
      />
    </div>
  )
}
