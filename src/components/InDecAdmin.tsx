'use client';
/**
 * InDecAdmin.tsx — Admin Tool for Managing in_dec Fields
 * ─────────────────────────────────────────────────────────────────────────────
 * This component provides a simple UI to:
 *   1. View all users and their in_dec status
 *   2. Bulk sync in_dec fields for all users
 *   3. Manually toggle in_dec for individual users
 * 
 * USE THIS:
 *   - When first setting up Telegram integration
 *   - To fix deduplication issues
 *   - For debugging contact sync problems
 * 
 * ACCESS:
 *   Add this component to any admin page or temporarily to /onesutra page.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInDecManager, getInDecStatus, syncAllInDecFields, type InDecStatus } from '@/lib/inDecUtils';
import { useOneSutraAuth } from '@/hooks/useOneSutraAuth';

export default function InDecAdmin() {
    const { user } = useOneSutraAuth();
    const [users, setUsers] = useState<InDecStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<InDecStatus | null>(null);
    const [message, setMessage] = useState('');

    // Load all users on mount
    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        setLoading(true);
        try {
            const data = await syncAllInDecFields();
            setUsers(data);
            setMessage(`Loaded ${data.length} users`);
        } catch (err) {
            setMessage('Error loading users: ' + (err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    async function toggleInDec(userId: string, currentValue: boolean) {
        setLoading(true);
        try {
            const { setInDecManual } = await import('@/lib/inDecUtils');
            await setInDecManual(userId, !currentValue);
            
            // Refresh the list
            await loadUsers();
            setMessage(`Updated user ${userId}: in_dec=${!currentValue}`);
        } catch (err) {
            setMessage('Error updating: ' + (err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm) ||
        u.userId.includes(searchTerm)
    );

    const dualUsers = users.filter(u => u.in_dec);
    const singleUsers = users.filter(u => !u.in_dec);

    if (!user) {
        return <div style={{ padding: '2rem', color: 'white' }}>Please sign in first</div>;
    }

    return (
        <div style={{ padding: '1rem', maxWidth: 900, margin: '0 auto', color: 'white', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🔧 in_dec Field Admin</h1>
            
            {/* Stats */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(16,185,129,0.2)', padding: '1rem', borderRadius: 12, flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>{dualUsers.length}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Dual Users (in_dec=true)</div>
                </div>
                <div style={{ background: 'rgba(59,130,246,0.2)', padding: '1rem', borderRadius: 12, flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3B82F6' }}>{singleUsers.length}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Single Platform (in_dec=false)</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: 12, flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{users.length}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Total Users</div>
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontSize: '0.9rem',
                    }}
                />
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={loadUsers}
                    disabled={loading}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: 8,
                        border: 'none',
                        background: loading ? 'rgba(255,255,255,0.1)' : '#3B82F6',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                    }}
                >
                    {loading ? '⏳ Syncing...' : '🔄 Sync All'}
                </motion.button>
            </div>

            {/* Message */}
            {message && (
                <div style={{ 
                    padding: '0.75rem 1rem', 
                    marginBottom: '1rem', 
                    borderRadius: 8, 
                    background: message.includes('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                    color: message.includes('Error') ? '#FCA5A5' : '#6EE7B7',
                    fontSize: '0.9rem',
                }}>
                    {message}
                </div>
            )}

            {/* User List */}
            <div style={{ 
                maxHeight: 500, 
                overflowY: 'auto', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: 12,
                background: 'rgba(0,0,0,0.2)',
            }}>
                {filteredUsers.map((u) => (
                    <div 
                        key={u.userId}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            gap: '1rem',
                        }}
                    >
                        {/* Status Badge */}
                        <div style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: u.in_dec ? '#10B981' : '#6B7280',
                            flexShrink: 0,
                        }} />
                        
                        {/* User Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                {u.phone} • {u.userId.slice(0, 8)}...
                            </div>
                            <div style={{ fontSize: '0.7rem', color: u.in_dec ? '#10B981' : '#6B7280', marginTop: 2 }}>
                                {u.in_dec ? '✅ Dual User (in_dec=true)' : '⚪ Single Platform (in_dec=false)'}
                            </div>
                        </div>

                        {/* Toggle Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleInDec(u.userId, u.in_dec)}
                            disabled={loading}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 6,
                                border: 'none',
                                background: u.in_dec ? 'rgba(239,68,68,0.8)' : 'rgba(16,185,129,0.8)',
                                color: 'white',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                            }}
                        >
                            {u.in_dec ? 'Set FALSE' : 'Set TRUE'}
                        </motion.button>
                    </div>
                ))}
            </div>

            {/* Instructions */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>📖 What is in_dec?</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                    The <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>in_dec</code> field 
                    prevents duplicate contacts in your UI. When <strong>true</strong>, the user exists in 
                    both OneSUTRA and Telegram, so they appear as ONE merged contact. When <strong>false</strong>, 
                    they appear as a separate contact for each platform.
                </p>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>
                    <strong>How to use:</strong> Click "Sync All" to automatically set in_dec based on 
                    telegram_synced status. Or manually toggle individual users.
                </p>
            </div>
        </div>
    );
}
