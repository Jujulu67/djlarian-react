'use client';

import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { socialLinks } from '@/config/socialLinks';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useUiVersion } from '@/hooks/useUiVersion';

/** Champ de formulaire v2 */
const FIELD_V2 =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/30 outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-white/20 focus:border-brand/70 focus:ring-4 focus:ring-brand/15';
const LABEL_V2 = 'mb-2 block text-sm font-medium text-white/80';

/** Carte de contact pro (management, booking) */
function ContactCardV2({
  icon,
  title,
  description,
  email,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  email: string;
}) {
  const spotlight = useSpotlight<HTMLAnchorElement>();

  return (
    <a
      href={`mailto:${email}`}
      className="group spotlight surface-1 flex items-start gap-4 rounded-2xl p-5 transition-[transform,border-color] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/15 active:scale-[0.99] md:p-6"
      {...spotlight}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white/70 ring-1 ring-inset ring-white/10">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 block font-semibold text-white">{title}</span>
        <span className="mb-2 block text-sm text-white/60">{description}</span>
        <span className="inline-flex items-center gap-1.5 break-all text-sm font-medium text-purple-300 transition-colors group-hover:text-white">
          <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
          {email}
        </span>
      </span>
    </a>
  );
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simuler l'envoi du formulaire
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isV2 = useUiVersion() === 'v2';

  if (isV2) {
    return (
      <div className="min-h-[calc(100vh-4rem)] px-4 py-16 md:py-24">
        <div className="mx-auto max-w-[1180px]">
          <PageHeader
            eyebrow="Contact"
            title="Contact"
            description="Une question ? Une proposition de collaboration ? N'hésitez pas à me contacter."
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
            {/* Formulaire */}
            <Reveal className="surface-1 rounded-2xl p-6 md:p-8">
              <h2 className="mb-6 text-lg font-semibold text-white">Envoyer un message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className={LABEL_V2}>
                      Nom
                    </label>
                    <input
                      type="text"
                      id="name"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className={FIELD_V2}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className={LABEL_V2}>
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className={FIELD_V2}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className={LABEL_V2}>
                    Sujet
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className={FIELD_V2}
                  />
                </div>
                <div>
                  <label htmlFor="message" className={LABEL_V2}>
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                    className={`${FIELD_V2} resize-none`}
                  />
                </div>
                <Button type="submit" size="lg" disabled={isSubmitting} className="h-12 w-full">
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
                </Button>
                <div role="status" aria-live="polite">
                  {submitStatus === 'success' && (
                    <p className="flex items-center gap-2 text-sm text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Message envoyé avec succès !
                    </p>
                  )}
                  {submitStatus === 'error' && (
                    <p className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      Une erreur est survenue. Veuillez réessayer.
                    </p>
                  )}
                </div>
              </form>
            </Reveal>

            {/* Réseaux + contacts pro */}
            <RevealGroup className="flex flex-col gap-6">
              <RevealItem className="surface-1 rounded-2xl p-6 md:p-8">
                <h2 className="mb-4 text-lg font-semibold text-white">Réseaux Sociaux</h2>
                <ul className="grid grid-cols-2 gap-2">
                  {socialLinks.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm text-white/70 ring-1 ring-inset ring-white/[0.06] transition-[color,background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.06] hover:text-white active:scale-[0.98] [&_svg]:h-5 [&_svg]:w-5"
                      >
                        {link.icon}
                        <span className="min-w-0 flex-1 truncate">{link.name}</span>
                        <ArrowUpRight
                          className="h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-white/70"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </RevealItem>
              <RevealItem>
                <ContactCardV2
                  icon={<Briefcase className="h-5 w-5" />}
                  title="Management"
                  description="Pour les demandes professionnelles, veuillez contacter mon manager :"
                  email="manager@larian.com"
                />
              </RevealItem>
              <RevealItem>
                <ContactCardV2
                  icon={<CalendarCheck className="h-5 w-5" />}
                  title="Booking"
                  description="Pour les réservations d'événements et les performances live :"
                  email="booking@larian.com"
                />
              </RevealItem>
            </RevealGroup>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-audiowide mb-6">Contact</h1>
          <p className="text-xl text-gray-300 font-montserrat max-w-2xl mx-auto">
            Une question ? Une proposition de collaboration ? N&apos;hésitez pas à me contacter.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Formulaire de contact */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-montserrat mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/10 focus:border-purple-500/50 transition-all text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-montserrat mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/10 focus:border-purple-500/50 transition-all text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-montserrat mb-2">
                  Sujet
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/10 focus:border-purple-500/50 transition-all text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-montserrat mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/10 focus:border-purple-500/50 transition-all text-white resize-none placeholder-gray-400"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-montserrat transition-colors duration-200 disabled:opacity-50"
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
              </button>
              {submitStatus === 'success' && (
                <p className="text-green-400 text-sm mt-2">Message envoyé avec succès !</p>
              )}
              {submitStatus === 'error' && (
                <p className="text-red-400 text-sm mt-2">
                  Une erreur est survenue. Veuillez réessayer.
                </p>
              )}
            </form>
          </motion.div>

          {/* Informations de contact et réseaux sociaux */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-2xl font-audiowide mb-4">Réseaux Sociaux</h2>
              <div className="flex gap-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.name}
                    className="text-gray-300 hover:text-purple-400 transition-colors duration-200"
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-audiowide mb-4">Management</h2>
              <p className="text-gray-300">
                Pour les demandes professionnelles, veuillez contacter mon manager :
              </p>
              <a
                href="mailto:manager@larian.com"
                className="text-white hover:text-gray-300 transition-colors duration-200"
              >
                manager@larian.com
              </a>
            </div>

            <div>
              <h2 className="text-2xl font-audiowide mb-4">Booking</h2>
              <p className="text-gray-300">
                Pour les réservations d&apos;événements et les performances live :
              </p>
              <a
                href="mailto:booking@larian.com"
                className="text-white hover:text-gray-300 transition-colors duration-200"
              >
                booking@larian.com
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
