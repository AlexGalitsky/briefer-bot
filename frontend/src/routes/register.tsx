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
    <div className="flex min-h-screen flex-col px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex justify-end">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md flex-1">
        <PhoneAuthForm
          purpose="register"
          title="Регистрация"
          description="Создайте аккаунт по номеру телефона"
          alternateLink={{ to: '/login', label: 'Уже есть аккаунт? Войти' }}
        />
      </div>
    </div>
  )
}
