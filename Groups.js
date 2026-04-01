import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups]   = useState([]);
  const [active, setActive]   = useState(null);
  const [posts, setPosts]     = useState([]);
  const [input, setInput]     = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newG, setNewG]       = useState({ title:'', description:'' });
  const socketRef = useRef(null);
  const activeRef = useRef(null);
  const bottomRef = useRef(null);

  // Track active group in ref so socket listener always has latest value
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Socket connection - create once on mount, disconnect on unmount
  useEffect(() => {
    const token = localStorage.getItem('fmc_token');
    socketRef.current = io('http://localhost:5000', { auth:{ token } });
    socketRef.current.on('group_post', p => {
      // Only add message if it's for the currently active group
      if (activeRef.current && p.group_id === activeRef.current.group_id) {
        setPosts(prev => {
          // Find and replace optimistic post (without post_id) with confirmed post
          const idx = prev.findIndex(post => 
            post.content === p.content && post.author === p.author && !post.post_id
          );
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = p;
            return updated;
          }
          // If not found (shouldn't happen), just add it
          return [...prev, p];
        });
      }
    });
    api.get('/groups').then(r => setGroups(r.data));
    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [posts]);

  const openGroup = async g => {
    if (active) socketRef.current.emit('leave_group', active.group_id);
    setActive(g);
    socketRef.current.emit('join_group', g.group_id);
    const { data } = await api.get(`/groups/${g.group_id}/posts`);
    setPosts(data);
  };

  const join = async id => {
    try {
      await api.post(`/groups/${id}/join`);
      api.get('/groups').then(r => setGroups(r.data));
    } catch (err) {
      console.log('Join error:', err.message);
    }
  };

  const create = async () => {
    if (!newG.title.trim()) return;
    await api.post('/groups', newG);
    setShowNew(false); setNewG({ title:'', description:'' });
    api.get('/groups').then(r => setGroups(r.data));
  };

  const sendPost = () => {
    if (!input.trim() || !active) return;
    
    // Show message immediately (optimistic update)
    const newPost = {
      group_id: active.group_id,
      author: user?.anonymous_id,
      content: input,
      posted_at: new Date().toISOString()
    };
    setPosts(prev => [...prev, newPost]);
    setInput('');
    
    // Send to server
    socketRef.current.emit('group_message', { groupId: active.group_id, content: input });
  };

  return (
    <div className="layout">
      <Sidebar/>
      <main className="main">
        <div className="row jb mb8">
          <h1 className="pg-title">👥 Group Discussions</h1>
          {user?.role === 'superadmin' && (
            <button className="btn btn-primary btn-sm" onClick={()=>setShowNew(!showNew)}>+ Create Group</button>
          )}
        </div>
        <p className="pg-sub">Join public groups to discuss campus issues anonymously</p>

        {showNew && (
          <div className="card" style={{marginBottom:18,border:'2px solid #dbeafe'}}>
            <h3 style={{fontWeight:700,marginBottom:12}}>Create New Group</h3>
            <div className="fg"><input className="fi" placeholder="Group title *" value={newG.title} onChange={e=>setNewG({...newG,title:e.target.value})}/></div>
            <div className="fg"><textarea className="ft" rows={2} placeholder="Description (optional)" value={newG.description} onChange={e=>setNewG({...newG,description:e.target.value})}/></div>
            <div className="row" style={{gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={create}>Create</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setShowNew(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="chat-layout">
          <div className="chat-list">
            {groups.map(g=>(
              <div key={g.group_id} className={`chat-item${active?.group_id===g.group_id?' active':''}`} onClick={()=>openGroup(g)}>
                <h4>👥 {g.title}</h4>
                <p>{g.member_count} members</p>
                {!g.is_member && (
                  <button className="btn btn-secondary btn-sm" style={{marginTop:5,fontSize:11}}
                    onClick={e=>{e.stopPropagation();join(g.group_id);}}>Join</button>
                )}
              </div>
            ))}
          </div>

          <div className="chat-win">
            {!active
              ? <div className="empty" style={{marginTop:80}}><h3>Select a group</h3><p>Join a group to discuss campus issues</p></div>
              : <>
                  <div className="chat-head">
                    👥 {active.title}
                    {active.description && <span style={{fontSize:12,color:'#6b7280',fontWeight:400,marginLeft:10}}>{active.description}</span>}
                  </div>
                  <div className="chat-msgs">
                    {posts.map((p,i)=>{
                      const mine = p.author===user?.anonymous_id;
                      return (
                        <div key={i} className={`msg ${mine?'mine':'theirs'}`}>
                          <div className="bubble">{p.content}</div>
                          <div className="msg-meta">{p.author} · {new Date(p.posted_at).toLocaleTimeString()}</div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef}/>
                  </div>
                  <div className="chat-input">
                    <input className="fi" placeholder="Post in group..."
                      value={input} onChange={e=>setInput(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&sendPost()}/>
                    <button className="btn btn-primary" onClick={sendPost}>Post</button>
                  </div>
                </>
            }
          </div>
        </div>
      </main>
    </div>
  );
}
