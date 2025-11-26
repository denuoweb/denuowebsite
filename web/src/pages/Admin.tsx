import { IconButton, Tooltip } from '@radix-ui/themes'
import { GlobeIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'

import { auth, isConfigured } from '../lib/firebase'
import type { Language, UiCopy } from '../i18n/uiCopy'
import type { ProcessStep, Project, Service, SiteContent } from '../types'

interface AdminProps {
  content: SiteContent
  onSave: (next: SiteContent) => Promise<void>
  appearance: 'light' | 'dark'
  onToggleTheme: () => void
  language: Language
  onToggleLanguage: () => void
  copy: UiCopy
}

const AdminPage = ({
  content,
  onSave,
  appearance,
  onToggleTheme,
  language,
  onToggleLanguage,
  copy,
}: AdminProps) => {
  const [draft, setDraft] = useState<SiteContent>(content)
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [authError, setAuthError] = useState<string>('')
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [invoiceForm, setInvoiceForm] = useState({ email: '', name: '', amountUsd: '', description: '' })
  const [invoiceStatus, setInvoiceStatus] = useState<string>('')

  useEffect(() => {
    setDraft(content)
  }, [content])

  useEffect(() => {
    if (!auth) return
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth) {
      setAuthError('Firebase is not configured yet.')
      return
    }
    try {
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password)
      setAuthError('')
      setStatus('Signed in.')
    } catch (err) {
      setAuthError('Unable to sign in. Check credentials and admin claim.')
      console.error(err)
    }
  }

  const handleCreateInvoice = async () => {
    if (!auth || !user) {
      setInvoiceStatus('Sign in as admin to send invoices.')
      return
    }
    const amountCents = Math.round(Number(invoiceForm.amountUsd || 0) * 100)
    if (!invoiceForm.email || !invoiceForm.name || !amountCents) {
      setInvoiceStatus('Email, name, and a positive amount are required.')
      return
    }
    setInvoiceStatus('Sending invoice…')
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/billing/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: invoiceForm.email,
          name: invoiceForm.name,
          amountCents,
          description: invoiceForm.description,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Invoice failed')
      }
      setInvoiceStatus(`Invoice sent. URL: ${data.hostedInvoiceUrl}`)
    } catch (err) {
      console.error(err)
      setInvoiceStatus('Invoice failed. Check Stripe key and permissions.')
    }
  }

  const handleSignOut = async () => {
    if (!auth) return
    await signOut(auth)
    setStatus('Signed out.')
  }

  const handleSave = async () => {
    setSaving(true)
    setStatus('')
    try {
      await onSave(draft)
      setStatus('Content saved to Firestore.')
    } catch (err) {
      console.error(err)
      setStatus('Save failed. Confirm Firebase config and your admin claim.')
    } finally {
      setSaving(false)
    }
  }

  const differentiatorsText = useMemo(() => draft.differentiators.join('\n'), [draft.differentiators])

  const updateService = (index: number, next: Partial<Service>) => {
    const updated = draft.services.map((svc, idx) => (idx === index ? { ...svc, ...next } : svc))
    setDraft({ ...draft, services: updated })
  }

  const updateProject = (index: number, next: Partial<Project>) => {
    const updated = draft.projects.map((proj, idx) => (idx === index ? { ...proj, ...next } : proj))
    setDraft({ ...draft, projects: updated })
  }

  const updateProcess = (index: number, next: Partial<ProcessStep>) => {
    const updated = draft.process.map((step, idx) => (idx === index ? { ...step, ...next } : step))
    setDraft({ ...draft, process: updated })
  }

  const addService = () => {
    const newService: Service = {
      title: 'New service',
      summary: 'Describe the value and outcome.',
      bullets: ['Add bullet points'],
      badge: 'New',
    }
    setDraft({ ...draft, services: [...draft.services, newService] })
  }

  const addProject = () => {
    const newProject: Project = {
      name: 'New project',
      summary: 'What it is and who it served.',
      impact: 'Impact or measurable result.',
      stack: ['Stack'],
      status: 'Planned',
    }
    setDraft({ ...draft, projects: [...draft.projects, newProject] })
  }

  if (!user) {
    return (
      <div className="admin-shell">
        <header className="top-nav">
          <div className="brand">
            <span className="dot" />
            <span>Admin · Denuo Web</span>
          </div>
          <nav className="nav-links">
            <Link to="/">{copy.nav.backToSite}</Link>
          </nav>
          <div className="nav-actions">
            <Tooltip content={copy.nav.themeToggle}>
              <IconButton variant="soft" onClick={onToggleTheme} aria-label={copy.nav.themeToggle}>
                {appearance === 'dark' ? <SunIcon /> : <MoonIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip content={copy.nav.languageToggle}>
              <IconButton variant="soft" onClick={onToggleLanguage} aria-label={copy.nav.languageToggle}>
                <GlobeIcon />
                <span className="lang-code">{language === 'en' ? 'EN' : '日本'}</span>
              </IconButton>
            </Tooltip>
          </div>
        </header>
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="kicker">Content dashboard</p>
              <h1>Admin sign in</h1>
              {!isConfigured && <p className="warning">Set VITE_FIREBASE_* env vars to enable auth + saves.</p>}
            </div>
            <div className="auth-box">
              <form className="auth-form" onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="admin email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                />
                <button className="btn primary" type="submit" disabled={!isConfigured}>
                  Sign in
                </button>
              </form>
              {authError && <p className="warning">{authError}</p>}
            </div>
          </div>
          <div className="form-grid">
            <section className="form-card">
              <div className="form-header">
                <h2>Access restricted</h2>
                <p className="muted">Sign in with an admin account to edit site content.</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="top-nav">
        <div className="brand">
          <span className="dot" />
          <span>Admin · Denuo Web</span>
        </div>
        <nav className="nav-links">
          <Link to="/">{copy.nav.backToSite}</Link>
        </nav>
        <div className="nav-actions">
          <Tooltip content={copy.nav.themeToggle}>
            <IconButton variant="soft" onClick={onToggleTheme} aria-label={copy.nav.themeToggle}>
              {appearance === 'dark' ? <SunIcon /> : <MoonIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip content={copy.nav.languageToggle}>
            <IconButton variant="soft" onClick={onToggleLanguage} aria-label={copy.nav.languageToggle}>
              <GlobeIcon />
              <span className="lang-code">{language === 'en' ? 'EN' : '日本'}</span>
            </IconButton>
          </Tooltip>
        </div>
      </header>

      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="kicker">Content dashboard</p>
            <h1>Update site copy, services, and projects.</h1>
            {!isConfigured && <p className="warning">Set VITE_FIREBASE_* env vars to enable auth + saves.</p>}
          </div>
          <div className="auth-box">
            <p className="muted">Signed in as {user.email}</p>
            <button className="btn ghost" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
        <div className="form-grid">
          <section className="form-card">
            <div className="form-header">
              <h2>Hero</h2>
              <p className="muted">Headline, subtitle, and CTAs.</p>
            </div>
            <label>
              Eyebrow
              <input
                value={draft.hero.eyebrow}
                onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, eyebrow: e.target.value } })}
              />
            </label>
            <label>
              Title
              <input
                value={draft.hero.title}
                onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, title: e.target.value } })}
              />
            </label>
            <label>
              Subtitle
              <textarea
                value={draft.hero.subtitle}
                onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, subtitle: e.target.value } })}
              />
            </label>
            <label>
              Badge
              <input
                value={draft.hero.badge}
                onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, badge: e.target.value } })}
              />
            </label>
            <div className="two-col">
              <label>
                Primary CTA
                <input
                  value={draft.hero.primaryCta}
                  onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, primaryCta: e.target.value } })}
                />
              </label>
              <label>
                Secondary CTA
                <input
                  value={draft.hero.secondaryCta}
                  onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, secondaryCta: e.target.value } })}
                />
              </label>
            </div>
          </section>

          <section className="form-card">
            <div className="form-header">
              <h2>Services</h2>
              <p className="muted">Cards with bullets.</p>
            </div>
            {draft.services.map((service, idx) => (
              <div key={service.title + idx} className="sub-card">
                <div className="two-col">
                  <label>
                    Badge
                    <input
                      value={service.badge ?? ''}
                      onChange={(e) => updateService(idx, { badge: e.target.value })}
                    />
                  </label>
                  <label>
                    Title
                    <input value={service.title} onChange={(e) => updateService(idx, { title: e.target.value })} />
                  </label>
                </div>
                <label>
                  Summary
                  <textarea
                    value={service.summary}
                    onChange={(e) => updateService(idx, { summary: e.target.value })}
                  />
                </label>
                <label>
                  Bullets (one per line)
                  <textarea
                    value={service.bullets.join('\n')}
                    onChange={(e) => updateService(idx, { bullets: e.target.value.split('\n').filter(Boolean) })}
                  />
                </label>
              </div>
            ))}
            <button className="btn ghost" type="button" onClick={addService}>
              + Add service
            </button>
          </section>

          <section className="form-card">
            <div className="form-header">
              <h2>Projects</h2>
              <p className="muted">Recent work tiles.</p>
            </div>
            {draft.projects.map((project, idx) => (
              <div key={project.name + idx} className="sub-card">
                <label>
                  Name
                  <input value={project.name} onChange={(e) => updateProject(idx, { name: e.target.value })} />
                </label>
                <label>
                  Summary
                  <textarea
                    value={project.summary}
                    onChange={(e) => updateProject(idx, { summary: e.target.value })}
                  />
                </label>
                <label>
                  Impact
                  <textarea
                    value={project.impact}
                    onChange={(e) => updateProject(idx, { impact: e.target.value })}
                  />
                </label>
                <div className="two-col">
                  <label>
                    Status
                    <input value={project.status ?? ''} onChange={(e) => updateProject(idx, { status: e.target.value })} />
                  </label>
                  <label>
                    Link
                    <input value={project.link ?? ''} onChange={(e) => updateProject(idx, { link: e.target.value })} />
                  </label>
                </div>
                <label>
                  Stack (comma-separated)
                  <input
                    value={project.stack.join(', ')}
                    onChange={(e) => updateProject(idx, { stack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  />
                </label>
              </div>
            ))}
            <button className="btn ghost" type="button" onClick={addProject}>
              + Add project
            </button>
          </section>

          <section className="form-card">
            <div className="form-header">
              <h2>Differentiators</h2>
              <p className="muted">Shown as pills under services.</p>
            </div>
            <label>
              One per line
              <textarea
                value={differentiatorsText}
                onChange={(e) => setDraft({ ...draft, differentiators: e.target.value.split('\n').filter(Boolean) })}
              />
            </label>
          </section>

          <section className="form-card">
            <div className="form-header">
              <h2>Process steps</h2>
              <p className="muted">Four steps recommended.</p>
            </div>
            {draft.process.map((step, idx) => (
              <div key={step.title + idx} className="sub-card">
                <label>
                  Title
                  <input value={step.title} onChange={(e) => updateProcess(idx, { title: e.target.value })} />
                </label>
                <label>
                  Detail
                  <textarea value={step.detail} onChange={(e) => updateProcess(idx, { detail: e.target.value })} />
                </label>
                <label>
                  Outcome
                  <input value={step.outcome} onChange={(e) => updateProcess(idx, { outcome: e.target.value })} />
                </label>
              </div>
            ))}
          </section>

          <section className="form-card">
            <div className="form-header">
              <h2>Contact</h2>
              <p className="muted">CTA and contact channels.</p>
            </div>
            <label>
              Headline
              <input
                value={draft.contact.headline}
                onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, headline: e.target.value } })}
              />
            </label>
            <label>
              Subhead
              <textarea
                value={draft.contact.subhead}
                onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, subhead: e.target.value } })}
              />
            </label>
            <div className="two-col">
              <label>
                Email
                <input
                  value={draft.contact.email}
                  onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, email: e.target.value } })}
                />
              </label>
              <label>
                Phone
                <input
                  value={draft.contact.phone}
                  onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, phone: e.target.value } })}
                />
              </label>
            </div>
            <label>
              Calendly / booking URL
              <input
                value={draft.contact.calendly ?? ''}
                onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, calendly: e.target.value } })}
              />
            </label>
            <label>
              Note
              <textarea
                value={draft.contact.note ?? ''}
                onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, note: e.target.value } })}
              />
            </label>
          </section>

          <section className="form-card">
            <div className="form-header">
              <h2>Billing (Stripe)</h2>
              <p className="muted">Create and email a Stripe invoice. Admin auth + STRIPE_SECRET_KEY required.</p>
            </div>
            <label>
              Customer email
              <input
                value={invoiceForm.email}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, email: e.target.value })}
              />
            </label>
            <label>
              Customer name
              <input
                value={invoiceForm.name}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, name: e.target.value })}
              />
            </label>
            <div className="two-col">
              <label>
                Amount (USD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceForm.amountUsd}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amountUsd: e.target.value })}
                />
              </label>
              <label>
                Description
                <input
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                />
              </label>
            </div>
            <button className="btn primary" type="button" onClick={handleCreateInvoice} disabled={!user}>
              {user ? 'Send invoice' : 'Sign in to send'}
            </button>
            {invoiceStatus && <p className="muted">{invoiceStatus}</p>}
          </section>
        </div>

        <div className="form-actions">
          <div className="muted">Saves write to Firestore collection `siteContent/public`. Restrict writes with an admin custom claim.</div>
          <button className="btn primary" onClick={handleSave} disabled={saving || !user}>
            {saving ? 'Saving…' : user ? 'Save content' : 'Sign in to save'}
          </button>
          {status && <p className="muted">{status}</p>}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
