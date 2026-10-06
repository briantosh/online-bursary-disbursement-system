import { useEffect, useState } from 'react';
import { courses } from '../shared/courses.js';
import { bursaries } from '../shared/bursaries.js';
import { apiRequest, downloadRequest } from './api.js';

const roleNames = {
    student: 'Student',
    bursary_officer: 'Bursary officer',
    admin: 'System admin'
};

export function App() {
    const [authView, setAuthView] = useState('login');
    const [loginPortal, setLoginPortal] = useState('student');
    const [user, setUser] = useState(null);
    const [token, setToken] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    async function establishSession(result) {
        setToken(result.accessToken);
        setUser(result.user);
        setAuthView('login');
        setError('');
        setNotice('');
    }

    async function submitLogin(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        const form = new FormData(event.currentTarget);
        const role = loginPortal === 'student' ? 'student' : form.get('role');
        try {
            const result = await apiRequest('/auth/login', {
                body: { email: form.get('email'), password: form.get('password'), role }
            });
            await establishSession(result);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    async function submitRegistration(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        const form = new FormData(event.currentTarget);
        const password = form.get('password');
        if (password !== form.get('confirmPassword')) {
            setError('The passwords do not match.');
            setBusy(false);
            return;
        }

        try {
            const result = await apiRequest('/auth/register', {
                body: {
                    fullName: form.get('fullName'),
                    email: form.get('email'),
                    password,
                    admissionNumber: form.get('admissionNumber'),
                    course: form.get('course'),
                    yearOfStudy: form.get('yearOfStudy')
                }
            });
            await establishSession(result);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    async function createStaffAccount(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        try {
            await apiRequest('/admin/staff', {
                token,
                body: {
                    fullName: form.get('fullName'),
                    email: form.get('email'),
                    password: form.get('password'),
                    role: form.get('role')
                }
            });
            formElement.reset();
            setNotice('Staff account created.');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    async function registerStudent(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        try {
            await apiRequest('/admin/students', {
                token,
                body: {
                    admissionNumber: form.get('admissionNumber'),
                    fullName: form.get('fullName'),
                    email: form.get('email'),
                    course: form.get('course'),
                    status: form.get('status')
                }
            });
            formElement.reset();
            setNotice('Student added to the verified registry. They can now create an account.');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    function signOut() {
        setUser(null);
        setToken('');
        setError('');
        setNotice('');
        setAuthView('login');
        setLoginPortal('student');
    }

    if (user) {
        return <Dashboard user={user} token={token} busy={busy} error={error} notice={notice} onSignOut={signOut} onCreateStaff={createStaffAccount} onRegisterStudent={registerStudent} />;
    }

    return (
        <main className="auth-screen">
            <div className="auth-shell">
                <section className="auth-story">
                    <div className="brand auth-brand">
                        <div className="brand-mark">S</div>
                        <div><div className="brand-name">Scholarship Office</div><div className="brand-sub">Bursary portal</div></div>
                    </div>
                    <div className="auth-story-copy">
                        <div className="eyebrow">STUDENT FUNDING · 2026–27</div>
                        <h1>Support for<br />the next step.</h1>
                        <p>Apply for bursary funding, follow decisions, and manage student support through one verified portal.</p>
                        <div className="auth-role-list"><span>Student applications</span><span>Officer reviews</span><span>Admin oversight</span></div>
                    </div>
                    <div className="auth-story-foot">Scholarship Office <span>·</span> Enrolled students verified against the student register</div>
                </section>

                <section className="auth-panel">
                    <div className="auth-tabs" role="tablist" aria-label="Account access">
                        <button className={`auth-tab ${authView === 'login' ? 'active' : ''}`} type="button" onClick={() => { setAuthView('login'); setError(''); }}>Sign in</button>
                        <button className={`auth-tab ${authView === 'register' ? 'active' : ''}`} type="button" onClick={() => { setAuthView('register'); setError(''); }}>Student registration</button>
                    </div>

                    {authView === 'login' ? (
                        <div className="auth-form-view">
                            <div className="login-mode-switch" role="tablist" aria-label="Choose your sign-in portal">
                                <button className={`login-mode-button ${loginPortal === 'student' ? 'active' : ''}`} type="button" onClick={() => { setLoginPortal('student'); setError(''); }}>Student</button>
                                <button className={`login-mode-button ${loginPortal === 'staff' ? 'active' : ''}`} type="button" onClick={() => { setLoginPortal('staff'); setError(''); }}>Staff &amp; admin</button>
                            </div>
                            <div className="auth-heading">
                                <div className="eyebrow">{loginPortal === 'student' ? 'STUDENT PORTAL' : 'STAFF PORTAL'}</div>
                                <h2>{loginPortal === 'student' ? 'Student sign in' : 'Staff sign in'}</h2>
                                <p>{loginPortal === 'student' ? 'Access your bursary applications and funding updates.' : 'For bursary officers and system administrators.'}</p>
                            </div>
                            <form className="auth-form" onSubmit={submitLogin}>
                                {loginPortal === 'staff' && <div className="field"><label htmlFor="staff-role">Staff account type</label><select id="staff-role" name="role"><option value="bursary_officer">Bursary officer</option><option value="admin">System admin</option></select></div>}
                                <div className="field"><label htmlFor="login-email">{loginPortal === 'student' ? 'Student email' : 'Staff email'}</label><input id="login-email" name="email" type="email" autoComplete="username" required /></div>
                                <div className="field"><label htmlFor="login-password">Password</label><input id="login-password" name="password" type="password" autoComplete="current-password" required /></div>
                                {error && <p className="auth-error" role="alert">{error}</p>}
                                <button className="btn btn-primary auth-submit" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'} <span>→</span></button>
                            </form>
                        </div>
                    ) : (
                        <div className="auth-form-view">
                            <div className="auth-heading"><div className="eyebrow">ENROLLED STUDENTS</div><h2>Create a student account</h2><p>Your admission details must match the university student register.</p></div>
                            <form className="auth-form" onSubmit={submitRegistration}>
                                <div className="field"><label htmlFor="register-name">Full name</label><input id="register-name" name="fullName" autoComplete="name" required /></div>
                                <div className="field"><label htmlFor="register-email">University email</label><input id="register-email" name="email" type="email" autoComplete="email" required /></div>
                                <div className="field"><label htmlFor="register-admission">Admission number</label><input id="register-admission" name="admissionNumber" autoComplete="off" maxLength="32" required /></div>
                                <div className="field"><label htmlFor="register-course">Course of study</label><select id="register-course" name="course" defaultValue="" required><option value="" disabled>Select your course</option>{courses.map(course => <option key={course}>{course}</option>)}</select></div>
                                <div className="field"><label htmlFor="register-year">Year of study</label><select id="register-year" name="yearOfStudy" defaultValue="" required><option value="" disabled>Select your year</option><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option><option>Postgraduate</option></select></div>
                                <div className="field"><label htmlFor="register-password">Password</label><input id="register-password" name="password" type="password" minLength="12" autoComplete="new-password" required /></div>
                                <div className="field"><label htmlFor="register-confirm">Confirm password</label><input id="register-confirm" name="confirmPassword" type="password" minLength="12" autoComplete="new-password" required /></div>
                                {error && <p className="auth-error" role="alert">{error}</p>}
                                <button className="btn btn-primary auth-submit" disabled={busy} type="submit">{busy ? 'Verifying details…' : 'Verify & create account'} <span>→</span></button>
                            </form>
                        </div>
                    )}
                    <p className="auth-disclaimer">Sign-in tokens are held in memory for this session. Student enrollment is checked by the bursary API.</p>
                </section>
            </div>
        </main>
    );
}

function Dashboard({ user, token, busy, error, notice, onSignOut, onCreateStaff, onRegisterStudent }) {
    const isStudent = user.role === 'student';
    const title = isStudent ? 'Student portal' : user.role === 'admin' ? 'System administration' : 'Bursary office';

    return (
        <main className="portal-screen">
            <aside className="portal-sidebar">
                <div className="brand"><div className="brand-mark">S</div><div><div className="brand-name">Scholarship Office</div><div className="brand-sub">Bursary portal</div></div></div>
                <div className="portal-nav-label">{title}</div>
                <div className="portal-nav-item">{isStudent ? 'My bursary account' : user.role === 'admin' ? 'Administration' : 'Review workspace'}</div>
                <div className="portal-sidebar-bottom"><strong>Contact the bursary office</strong><span>Questions about access or funding?</span><a href="mailto:bursary@university.edu">bursary@university.edu</a></div>
            </aside>
            <section className="portal-main">
                <header className="portal-topbar"><span>{title}</span><div><span className="portal-identity">{user.fullName} · {roleNames[user.role]}</span><button className="btn btn-secondary btn-sm" type="button" onClick={onSignOut}>Sign out</button></div></header>
                <div className="portal-content">
                    <div className="eyebrow">{isStudent ? 'STUDENT FUNDING · 2026–27' : 'SECURE STAFF WORKSPACE'}</div>
                    <h1>{isStudent ? `Welcome, ${user.fullName.split(/\s+/)[0]}` : `Welcome, ${user.fullName.split(/\s+/)[0]}`}</h1>
                    <p className="portal-intro">{isStudent ? 'Your student identity has been verified. Your bursary account is ready.' : 'You are signed in to the role-based bursary workspace.'}</p>
                    <div className="portal-summary">
                        <div><span>Account status</span><strong>Active</strong></div>
                        <div><span>Access role</span><strong>{roleNames[user.role]}</strong></div>
                        {isStudent && <><div><span>Admission number</span><strong>{user.admissionNumber}</strong></div><div><span>Course of study</span><strong>{user.course}</strong></div></>}
                    </div>
                    {user.role === 'admin' && <>
                        <section className="portal-panel">
                            <div className="portal-panel-heading"><h2>Add verified student</h2><p>Add an enrolled student from the official register. They can then create their own account using these exact details.</p></div>
                            <form className="staff-create-form" onSubmit={onRegisterStudent}>
                                <div className="field"><label htmlFor="registry-admission">Admission number</label><input id="registry-admission" name="admissionNumber" maxLength="32" required /></div>
                                <div className="field"><label htmlFor="registry-name">Full name</label><input id="registry-name" name="fullName" required /></div>
                                <div className="field"><label htmlFor="registry-email">University email</label><input id="registry-email" name="email" type="email" required /></div>
                                <div className="field"><label htmlFor="registry-course">Course</label><select id="registry-course" name="course" defaultValue="" required><option value="" disabled>Select course</option>{courses.map(course => <option key={course}>{course}</option>)}</select></div>
                                <div className="field"><label htmlFor="registry-status">Enrollment status</label><select id="registry-status" name="status"><option value="enrolled">Enrolled</option><option value="graduated">Graduated</option><option value="withdrawn">Withdrawn</option></select></div>
                                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save student registry record'}</button>
                            </form>
                        </section>
                        <section className="portal-panel">
                            <div className="portal-panel-heading"><h2>Create staff account</h2><p>Provision a bursary officer or another system administrator.</p></div>
                            <form className="staff-create-form" onSubmit={onCreateStaff}>
                                <div className="field"><label htmlFor="staff-name">Full name</label><input id="staff-name" name="fullName" required /></div>
                                <div className="field"><label htmlFor="staff-email">Work email</label><input id="staff-email" name="email" type="email" required /></div>
                                <div className="field"><label htmlFor="staff-password">Temporary password</label><input id="staff-password" name="password" type="password" minLength="12" required /></div>
                                <div className="field"><label htmlFor="new-staff-role">Role</label><select id="new-staff-role" name="role"><option value="bursary_officer">Bursary officer</option><option value="admin">System admin</option></select></div>
                                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create staff account'}</button>
                            </form>
                        </section>
                        {error && <p className="auth-error" role="alert">{error}</p>}
                        {notice && <p className="success-message" role="status">{notice}</p>}
                    </>}
                    {isStudent && <StudentApplicationPortal token={token} />}
                    {user.role === 'bursary_officer' && <OfficerApplicationPortal token={token} />}
                    {user.role === 'admin' && <OfficerApplicationPortal token={token} />}
                    <p className="session-note">This access token expires after 15 minutes. Sign in again to start a new session.</p>
                </div>
            </section>
        </main>
    );
}

function StudentApplicationPortal({ token }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let active = true;
        apiRequest('/applications/mine', { token })
            .then(result => { if (active) setApplications(result.applications); })
            .catch(requestError => { if (active) setError(requestError.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [token]);

    async function submitApplication(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        const form = event.currentTarget;
        try {
            const result = await apiRequest('/applications', { token, formData: new FormData(form) });
            setApplications(current => [result.application, ...current]);
            form.reset();
            setFormOpen(false);
            setNotice('Your application and academic transcript were submitted.');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    async function downloadTranscript(application) {
        setError('');
        try {
            const file = await downloadRequest(`/applications/${application.id}/transcript`, token);
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = application.transcript_name || 'academic-transcript.pdf';
            link.click();
            URL.revokeObjectURL(url);
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <section className="portal-panel application-portal">
            <div className="portal-panel-heading application-heading">
                <div><h2>My bursary applications</h2><p>Submit a funding request and track its review status here.</p></div>
                <button className="btn btn-primary" type="button" onClick={() => { setFormOpen(open => !open); setError(''); setNotice(''); }}>{formOpen ? 'Close form' : '＋ New application'}</button>
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p className="success-message" role="status">{notice}</p>}
            {formOpen && <form className="application-form" onSubmit={submitApplication}>
                <div className="field"><label htmlFor="application-bursary">Bursary programme</label><select id="application-bursary" name="bursaryType" defaultValue="" required><option value="" disabled>Select a bursary</option>{bursaries.map(bursary => <option key={bursary}>{bursary}</option>)}</select></div>
                <div className="field"><label htmlFor="application-amount">Amount requested (£)</label><input id="application-amount" name="requestedAmount" type="number" min="100" max="5000" step="50" required /></div>
                <div className="field application-full"><label htmlFor="application-statement">How will this bursary support your studies?</label><textarea id="application-statement" name="statement" minLength="30" maxLength="5000" placeholder="Describe your circumstances and how the funding will help." required /></div>
                <div className="field application-full"><label htmlFor="application-transcript">Academic transcript (PDF)</label><input id="application-transcript" name="transcript" type="file" accept="application/pdf,.pdf" required /><span className="form-help">PDF only, maximum 10 MB.</span></div>
                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button>
            </form>}
            {loading ? <p className="application-empty">Loading your applications…</p> : applications.length ? <div className="application-list">
                {applications.map(application => <article className="student-application-card" key={application.id}>
                    <div className="application-card-top"><div><strong>{application.reference}</strong><span className={`application-status status-${application.status}`}>{formatStatus(application.status)}</span></div><time>{formatDate(application.created_at || application.createdAt)}</time></div>
                    <div className="application-card-bottom"><span>{application.bursary_type || application.bursaryType}</span><strong>{formatMoney(application.requested_amount ?? application.requestedAmount)}</strong></div>
                    <button className="row-action" type="button" onClick={() => downloadTranscript(application)}>↓ {application.transcript_name || application.transcriptName || 'Download transcript'}</button>
                    {application.review_note && <p className="review-note">Officer note: {application.review_note}</p>}
                </article>)}
            </div> : <p className="application-empty">You haven’t submitted an application yet.</p>}
        </section>
    );
}

function OfficerApplicationPortal({ token }) {
    const [applications, setApplications] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    async function loadApplications() {
        try {
            const result = await apiRequest('/applications', { token });
            setApplications(result.applications);
            setError('');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadApplications(); }, [token]);

    async function updateStatus(event, applicationId) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await apiRequest(`/applications/${applicationId}/status`, {
                token,
                method: 'PATCH',
                body: { status: form.get('status'), reviewNote: form.get('reviewNote') }
            });
            await loadApplications();
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function downloadTranscript(application) {
        try {
            const file = await downloadRequest(`/applications/${application.id}/transcript`, token);
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = application.transcript_name || 'academic-transcript.pdf';
            link.click();
            URL.revokeObjectURL(url);
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <section className="portal-panel application-portal">
            <div className="portal-panel-heading"><h2>Application review queue</h2><p>Review student requests, transcripts, and update application decisions.</p></div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            {loading ? <p className="application-empty">Loading applications…</p> : applications.length ? <div className="application-list">
                {applications.map(application => <article className="student-application-card" key={application.id}>
                    <div className="application-card-top"><div><strong>{application.reference}</strong><span className={`application-status status-${application.status}`}>{formatStatus(application.status)}</span></div><time>{formatDate(application.created_at)}</time></div>
                    <div className="application-review-student"><strong>{application.student_name}</strong><span>{application.student_email} · {application.admission_number} · {application.course}</span></div>
                    <div className="application-card-bottom"><span>{application.bursary_type}</span><strong>{formatMoney(application.requested_amount)}</strong></div>
                    <p className="application-statement">{application.statement}</p>
                    <button className="row-action" type="button" onClick={() => downloadTranscript(application)}>↓ {application.transcript_name || 'Download transcript'}</button>
                    <form className="review-form" onSubmit={event => updateStatus(event, application.id)}>
                        <div className="field"><label htmlFor={`status-${application.id}`}>Decision</label><select id={`status-${application.id}`} name="status" defaultValue={application.status}><option value="under_review">Under review</option><option value="needs_information">Needs information</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
                        <div className="field"><label htmlFor={`note-${application.id}`}>Note for student</label><input id={`note-${application.id}`} name="reviewNote" defaultValue={application.review_note || ''} maxLength="2000" /></div>
                        <button className="btn btn-secondary btn-sm" type="submit">Save decision</button>
                    </form>
                </article>)}
            </div> : <p className="application-empty">There are no applications to review yet.</p>}
        </section>
    );
}

function formatStatus(status) {
    return status.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatMoney(amount) {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}