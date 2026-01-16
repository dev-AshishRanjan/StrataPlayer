import React from 'react';
import { createRoot } from 'react-dom/client';
import { Link, Route, Switch, useLocation, Router } from 'wouter';
import { Home } from './pages/Home';
import { Playground } from './pages/Playground';
import { StrataLogo } from './ui/Icons';
import './index.css';

// Calculate the base path for routing.
// We safely access import.meta.env to prevent crashes.
const envBase = (import.meta as any).env?.BASE_URL;
const base = envBase ? envBase.replace(/\/$/, '') : '';

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const [location] = useLocation();
    const isActive = location === href;

    return (
        <Link href={href}>
            <span className={`cursor-pointer transition-colors ${isActive ? 'text-white' : 'hover:text-white'}`}>
                {children}
            </span>
        </Link>
    );
};

const App = () => {
    return (
        <Router base={base}>
            <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30">
                {/* Navbar */}
                <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/">
                            <div className="flex items-center gap-3 cursor-pointer group">
                                <StrataLogo className="w-9 h-9 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform" />
                                <span className="font-bold text-xl tracking-tight group-hover:text-white transition-colors">StrataPlayer</span>
                            </div>
                        </Link>
                        <div className="flex gap-6 text-sm font-medium text-zinc-400">
                            <NavLink href="/playground">Playground</NavLink>
                            <a href="https://github.com/dev-AshishRanjan/StrataPlayer#readme" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</a>
                            <a href="https://github.com/dev-AshishRanjan/StrataPlayer" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 w-full">
                    <Switch>
                        <Route path="/" component={Home} />
                        <Route path="/playground" component={Playground} />
                        {/* Fallback for 404 */}
                        <Route>
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-400">
                                <h2 className="text-2xl font-bold text-white mb-2">404</h2>
                                <p>Page not found</p>
                                <Link href="/">
                                    <span className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-sm text-white">Go Home</span>
                                </Link>
                            </div>
                        </Route>
                    </Switch>
                </main>
            </div>
        </Router>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);