
"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { postContactMessage } from '@/lib/client-actions';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

const initialState = {
  status: 'idle' as const,
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Message'}
    </Button>
  );
}

export default function ContactPage() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      subject: String(formData.get('subject') || ''),
      message: String(formData.get('message') || ''),
    };

    try {
      const res = await postContactMessage(payload as any);
      // Support both envelope { ok, data } and unwrapped { status, message }
      const payloadBody = (res && typeof res === 'object' && (res as any).ok && Object.prototype.hasOwnProperty.call((res as any), 'data')) ? (res as any).data : res;
      // Consider successful if payload indicates success via status/success flag or provides a message
      if (payloadBody && (payloadBody.status === 'success' || payloadBody.success === true || payloadBody.message)) {
        setSuccessMessage(payloadBody.message || 'Your message was sent.');
        toast({ title: 'Message Sent!', description: payloadBody.message || 'Thank you for reaching out.' });
        form.reset();
      } else {
        toast({ title: 'Error', description: (payloadBody && (payloadBody.error || payloadBody.message)) || 'Failed to send message', variant: 'destructive' });
      }
    } catch (err: unknown) {
      const e = err as { message?: string } | undefined;
      toast({ title: 'Error', description: e?.message || String(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="theme-orange flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto py-16 md:py-24 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-headline">Contact Us</CardTitle>
            <CardDescription>
              Have a question or feedback? We'd love to hear from you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage ? (
              <div className="text-center p-8">
                <h3 className="text-xl font-semibold mb-2">Thank you!</h3>
                <p className="text-muted-foreground">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" placeholder="Your Name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="your@email.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" placeholder="What is your message about?" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" rows={6} placeholder="Your message..." required />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Message'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
