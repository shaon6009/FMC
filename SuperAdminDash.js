import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../services/api';

export default function SuperAdminDash() {
  const [tab, setTab]     = useState('stats');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [depts, setDepts]  = useState([]);
  const [search, setSearch] = useState('');
  const [newAdmin, setNA]   = useState({ name:'', email:'', password:'', department_id:'' });
  const [msg, setMsg]       = useState('');
  const [msgType, setMsgType] = useState('ok');

  useEffect(() => {
    api.get('/superadmin/stats').then(r=>setStats(r.data));
    api.get('/reports/departments').then(r=>setDepts(r.data));
  }, []);

  useEffect(() => {
    if (tab==='users')   api.get(`/superadmin/users?search=${search}`).then(r=>setUsers(r.data.users||[]));
    if (tab==='reports') api.get('/superadmin/reports').then(r=>setReports(r.data||[]));
  }, [tab, search]);

  const ban = async (id, ban) => {
    await api.patch(`/superadmin/users/${id}/ban`, { ban });
    setUsers(u => u.map(x => x.user_id===id ? {...x, is_banned:ban} : x));
  };

  const del = async id => {
    if (!window.confirm('Delete this user permanently?')) return;
    await api.delete(`/superadmin/users/${id}`);
    setUsers(u => u.filter(x => x.user_id!==id));
  };

  const createAdmin = async () => {
    setMsg('');
    try {
      await api.post('/superadmin/admins', newAdmin);
      setMsg('✅ Admin created successfully!'); setMsgType('ok');
      setNA({ name:'', email:'', password:'', department_id:'' });
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.error || 'Failed'}`); setMsgType('err');
    }
  };

  const approve = async (id, approve) => {
    await api.patch(`/superadmin/reports/${id}/approve`, { approve });
    setReports(r => r.map(x => x.report_id===id ? {...x, is_approved:approve} : x));
  };

  const tabs = [
    {k:'stats',   l:'📊 Statistics'},
    {k:'users',   l:'👥 Users'},
    {k:'reports', l:'📋 All Reports'},
    {k:'create',  l:'➕ Create Admin'},
  ];

  return (
    <div className="layout">
      <Sidebar/>
      <main className="main">
        <h1 className="pg-title">🛡️ Super Admin Panel</h1>
        <p className="pg-sub">Full system control — users, reports, admins, analytics</p>

        <div className="row mb16" style={{gap:8,flexWrap:'wrap'}}>
          {tabs.map(t=>(
            <button key={t.k} className={`btn btn-sm ${tab===t.k?'btn-primary':'btn-secondary'}`} onClick={()=>setTab(t.k)}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab==='stats' && (
          <>
            <div className="stats">
              {[
                {l:'Users',    v:stats.users||0,   c:'#1e40af'},
                {l:'Reports',  v:stats.reports||0,  c:'#7c3aed'},
                {l:'Pending',  v:stats.pending||0,  c:'#d97706'},
                {l:'Resolved', v:stats.resolved||0, c:'#16a34a'},
                {l:'Admins',   v:stats.admins||0,   c:'#0891b2'},
              ].map(s=>(
                <div key={s.l} className="stat">
                  <div className="stat-n" style={{color:s.c}}>{s.v}</div>
                  <div className="stat-l">{s.l}</div>
                </div>
              ))}
            </div>
            {stats.byDept?.length>0 && (
              <div className="card">
                <h3 style={{fontWeight:700,marginBottom:12}}>Top Departments by Reports</h3>
                {stats.byDept.map(d=>(
                  <div key={d.name} className="row jb" style={{padding:'8px 0',borderBottom:'1px solid #f3f4f6'}}>
                    <span className="text-sm">{d.name}</span><strong>{d.count}</strong>
                  </div>
                ))}
              </div>
            )}
            {stats.byCat?.length>0 && (
              <div className="card">
                <h3 style={{fontWeight:700,marginBottom:12}}>Reports by Category</h3>
                {stats.byCat.map(c=>(
                  <div key={c.name} className="row jb" style={{padding:'8px 0',borderBottom:'1px solid #f3f4f6'}}>
                    <span className="text-sm">{c.name}</span><strong>{c.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Users */}
        {tab==='users' && (
          <div className="card" style={{padding:0}}>
            <div style={{padding:14,borderBottom:'1px solid #f3f4f6'}}>
              <input className="fi" style={{maxWidth:300}} placeholder="🔍 Search name or email..."
                value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>ANON-ID</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u=>(
                    <tr key={u.user_id}>
                      <td style={{fontWeight:500}}>{u.name}</td>
                      <td className="text-sm">{u.email}</td>
                      <td><span className="badge" style={{background:'#dbeafe',color:'#1e40af'}}>{u.role}</span></td>
                      <td className="mono">{u.anon_id}</td>
                      <td>{u.is_banned
                        ? <span className="badge b-rejected">Banned</span>
                        : <span className="badge b-resolved">Active</span>}
                      </td>
                      <td>
                        <div className="row" style={{gap:6}}>
                          <button className={`btn btn-sm ${u.is_banned?'btn-success':'btn-danger'}`}
                            onClick={()=>ban(u.user_id,!u.is_banned)}>
                            {u.is_banned?'Unban':'Ban'}
                          </button>
                          {u.role!=='superadmin' && (
                            <button className="btn btn-danger btn-sm" onClick={()=>del(u.user_id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports */}
        {tab==='reports' && (
          <div className="card" style={{padding:0}}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Report ID</th><th>Title</th><th>Author</th><th>Dept</th><th>Status</th><th>Approved</th><th>Action</th></tr></thead>
                <tbody>
                  {reports.map(r=>(
                    <tr key={r.report_id}>
                      <td className="mono">{r.report_id}</td>
                      <td style={{fontWeight:500}}>{r.title}</td>
                      <td className="text-sm text-gray">{r.author}</td>
                      <td className="text-sm">{r.department}</td>
                      <td><span className={`badge b-${r.status.toLowerCase().replace(' ','-').replace(' ','')}`}>{r.status}</span></td>
                      <td>{r.is_approved?'✅':'❌'}</td>
                      <td>
                        <button className={`btn btn-sm ${r.is_approved?'btn-danger':'btn-success'}`}
                          onClick={()=>approve(r.report_id,!r.is_approved)}>
                          {r.is_approved?'Hide':'Approve'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Admin */}
        {tab==='create' && (
          <div className="card" style={{maxWidth:480}}>
            <h3 style={{fontWeight:700,marginBottom:16}}>Create Department Admin Account</h3>
            {msg && <div className={`alert alert-${msgType==='ok'?'ok':'err'}`}>{msg}</div>}
            <div className="fg"><label className="fl">Full Name</label>
              <input className="fi" value={newAdmin.name} onChange={e=>setNA({...newAdmin,name:e.target.value})}/></div>
            <div className="fg"><label className="fl">DIU Email (@diu.edu.bd)</label>
              <input className="fi" type="email" placeholder="admin@diu.edu.bd" value={newAdmin.email} onChange={e=>setNA({...newAdmin,email:e.target.value})}/></div>
            <div className="fg"><label className="fl">Password</label>
              <input className="fi" type="password" value={newAdmin.password} onChange={e=>setNA({...newAdmin,password:e.target.value})}/></div>
            <div className="fg"><label className="fl">Assign Department</label>
              <select className="fs" value={newAdmin.department_id} onChange={e=>setNA({...newAdmin,department_id:e.target.value})}>
                <option value="">— Select department —</option>
                {depts.map(d=><option key={d.department_id} value={d.department_id}>{d.name}</option>)}
              </select></div>
            <button className="btn btn-primary" onClick={createAdmin}>Create Admin Account</button>
          </div>
        )}
      </main>
    </div>
  );
}
