import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function Chat() {
  const { user } = useAuth();
  const [chats, setChats]     = useState([]);
  const [active, setActive]   = useState(null);
  const [msgs, setMsgs]       = useState([]);
  const [input, setInput]     = useState('');
  const [search, setSearch]   = useState('');
  const [err, setErr]         = useState('');
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('fmc_token');
    socketRef.current = io('http://localhost:5000', { auth:{ token } });
    socketRef.current.on('new_message', msg => setMsgs(m => [...m, msg]));
    api.get('/chat').then(r => setChats(r.data));
    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const openChat = async chat => {
    if (active) socketRef.current.emit('leave_chat', active.chat_id);
    setActive(chat);
    socketRef.current.emit('join_chat', chat.chat_id);
    const { data } = await api.get(`/chat/${chat.chat_id}/messages`);
    setMsgs(data);
  };

  const startChat = async () => {
    if (!search.trim()) return;
    setErr('');
    try {
      await api.post('/chat/start', { anon_id: search.trim() });
      const { data } = await api.get('/chat');
      setChats(data); setSearch('');
    } catch (e) { setErr(e.response?.data?.error || 'User not found'); }
  };

  const send = () => {
    if (!input.trim() || !active) return;
    socketRef.current.emit('send_message', { chatId: active.chat_id, content: input });
    setInput('');
  };

  const other = chat => chat.user1_anon === user?.anonymous_id ? chat.user2_anon : chat.user1_anon;

  return (
    <div className="layout">
      <Sidebar/>
      <main className="main">
        <h1 className="pg-title">💬 Anonymous Chat</h1>
        <p className="pg-sub">Search for a user's ANON-ID to start a private anonymous conversation</p>

        <div className="chat-layout">
          <div className="chat-list">
            <div style={{padding:12,borderBottom:'1px solid #e5e7eb'}}>
              <input className="fi" style={{fontSize:13,marginBottom:6}} placeholder="Search ANON-ID..."
                value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&startChat()}/>
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontSize:13,padding:'7px 0'}} onClick={startChat}>
                Start Chat
              </button>
              {err && <p style={{color:'#dc2626',fontSize:12,marginTop:5}}>{err}</p>}
            </div>
            {chats.length === 0
              ? <p style={{padding:14,fontSize:13,color:'#9ca3af',textAlign:'center'}}>No conversations yet</p>
              : chats.map(c=>(
                <div key={c.chat_id} className={`chat-item${active?.chat_id===c.chat_id?' active':''}`} onClick={()=>openChat(c)}>
                  <h4>💬 {other(c)}</h4>
                  <p>Tap to open chat</p>
                </div>
              ))
            }
          </div>

          <div className="chat-win">
            {!active
              ? <div className="empty" style={{marginTop:80}}><h3>Select a conversation</h3><p>or start a new one by searching for an ANON-ID</p></div>
              : <>
                  <div className="chat-head">💬 {other(active)}</div>
                  <div className="chat-msgs">
                    {msgs.map((m,i)=>{
                      const mine = m.sender===user?.anonymous_id;
                      return (
                        <div key={i} className={`msg ${mine?'mine':'theirs'}`}>
                          <div className="bubble">{m.content}</div>
                          <div className="msg-meta">{mine?'You':m.sender} · {new Date(m.sent_at).toLocaleTimeString()}</div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef}/>
                  </div>
                  <div className="chat-input">
                    <input className="fi" placeholder="Type a message... (Enter to send)"
                      value={input} onChange={e=>setInput(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&send()}/>
                    <button className="btn btn-primary" onClick={send}>Send</button>
                  </div>
                </>
            }
          </div>
        </div>
      </main>
    </div>
  );
}
