import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useCreateMeeting } from '@/features/meetings/api/use-meetings'
import { createMeetingBodySchema } from '@/features/meetings/schemas/meeting.schema'
import { getApiErrorMessage } from '@/lib/parse-api'
import { z } from 'zod'

const formSchema = createMeetingBodySchema.extend({
  botName: z.string().max(100).optional(),
})

export function StartMeetingForm() {
  const createMeeting = useCreateMeeting()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { url: '', botName: 'Аура' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createMeeting.mutateAsync({
        url: values.url,
        botName: values.botName || undefined,
      })
      form.reset({ url: '', botName: 'Аура' })
      toast.success('Бот запускается')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новая встреча</CardTitle>
        <CardDescription>
          Вставьте ссылку на Yandex Telemost или Google Meet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="url">URL встречи</FieldLabel>
              <Input
                id="url"
                placeholder="https://telemost.yandex.ru/j/..."
                {...form.register('url')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="botName">Имя бота</FieldLabel>
              <Input id="botName" {...form.register('botName')} />
            </Field>
            <Button type="submit" disabled={createMeeting.isPending}>
              {createMeeting.isPending ? 'Запуск…' : 'Подключить бота'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
