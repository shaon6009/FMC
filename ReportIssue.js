import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../services/api';

export default function ReportIssue() {
  const [form, setForm]   = useState({ title:'', description:'', category_id:'', department_id:'' });
  const [files, setFiles] = useState([]);
  const [cats, setCats]   = useState([]);
  const [depts, setDepts] = useState([]);
  const [err, setErr]     = useState('');
  const [ok, setOk]       = useState('');
  const [busy, setBusy]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/reports/categories').then(r=>setCats(r.data));
    api.get('/reports/departments').then(r=>setDepts(r.data));
  }, []);

  const go = async e => {
    e.preventDefault(); setErr(''); setOk('');
    if (!form.title||!form.description||!form.category_id||!form.department_id)
      return setErr('All fields are required');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k,v));
      files.forEach(f => fd.append('attachments',f));
      const { data } = await api.post('/reports', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setOk(`Report submitted! Your Report ID: ${data.report_id}`);
      setTimeout(()=>navigate('/my-reports'), 2000);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to submit. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="layout">
      <Sidebar/>
      <main className="main">
        <h1 className="pg-title">📝 Report an Issue</h1>
        <p className="pg-sub">Your identity is protected. Reports are submitted anonymously using your ANON-ID.</p>
        <div className="card" style={{maxWidth:700}}>
          {err && <div className="alert alert-err">{err}</div>}
          {ok  && <div className="alert alert-ok">{ok}</div>}
          <form onSubmit={go}>
            <div className="fg">
              <label className="fl">Issue Title *</label>
              <input className="fi" placeholder="Short description of the issue" value={form.title}
                onChange={e=>setForm({...form,title:e.target.value})} required/>
            </div>
            <div className="grid2">
              <div className="fg">
                <label className="fl">Category *</label>
                <select className="fs" value={form.category_id}
                  onChange={e=>setForm({...form,category_id:e.target.value})} required>
                  <option value="">Select category</option>
                  {cats.map(c=><option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Department *</label>
                <select className="fs" value={form.department_id}
                  onChange={e=>setForm({...form,department_id:e.target.value})} required>
                  <option value="">Select department</option>
                  {depts.map(d=><option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="fg">
              <label className="fl">Detailed Description *</label>
              <textarea className="ft" rows={5}
                placeholder="Describe the problem in detail — where it is, when it started, how severe it is..."
                value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required/>
            </div>
            <div className="fg">
              <label className="fl">Attachments (optional)</label>
              <input type="file" multiple accept="image/*,.pdf"
                onChange={e=>setFiles(Array.from(e.target.files))}
                style={{display:'block',fontSize:13.5,marginTop:4}}/>
              <p className="text-sm text-gray" style={{marginTop:4}}>Images or PDF · Max 5 files · 5MB each</p>
              {files.length>0 && (
                <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
                  {files.map(f=><span key={f.name} className="tag">📎 {f.name}</span>)}
                </div>
              )}
            </div>
            <div className="row" style={{gap:10}}>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Submitting...' : '📤 Submit Report'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={()=>navigate('/dashboard')}>Cancel</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
