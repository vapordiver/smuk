import {useState} from 'react';
import {useNavigate, Link, useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const {login} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            navigate(from, {replace: true});
        } catch (err) {
            setError('Nieprawidłowy adres email lub hasło');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="bg-background text-on-background min-h-screen flex flex-col">
            <main className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center  mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-primary text-3xl">domain</span>
                            <h1 className="text-2xl font-bold tracking-tight text-on-surface">SMUK</h1>
                        </div>
                        <h2 className="text-2xl font-bold text-on-surface text-center mb-4">Zaloguj się</h2>
                        <p className="text-on-surface-variant text-sm tracking-wide uppercase text-center">System
                            Monitorowania
                            Usterek Kampusu</p>
                    </div>
                    {/* Login Form Card */}
                    <div className="bg-white border border-outline rounded-xl p-8 shadow-sm">
                        {/* Error Message */}
                        {error && (
                            <div
                                className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">error</span>
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label
                                    className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1"
                                    htmlFor="email">
                                    Email uczelniany
                                </label>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span
                                            className="material-symbols-outlined text-on-surface-variant text-xl">alternate_email</span>
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-[#f6f6f8] border-transparent focus:border-primary focus:ring-0 rounded-xl text-on-surface transition-all duration-200 placeholder:text-on-surface-variant/40 outline-none"
                                        placeholder="student@edu.p.lodz.pl"
                                    />
                                </div>
                            </div>
                            {/* Password Field */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label
                                        className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                                        htmlFor="password">
                                        Hasło
                                    </label>
                                </div>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span
                                            className="material-symbols-outlined text-on-surface-variant text-xl">lock_open</span>
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-12 py-3 bg-[#f6f6f8] border-transparent focus:border-primary focus:ring-0 rounded-xl text-on-surface transition-all duration-200 outline-none placeholder:text-on-surface-variant/40"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                    >
                                        <span
                                            className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>
                            {/* Action Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-[0.98] active:scale-[0.95] transition-all duration-200 flex justify-center items-center gap-2 group disabled:opacity-70 disabled:hover:scale-100"
                                >
                                    {isLoading ? (
                                        <span
                                            className="material-symbols-outlined animate-spin">progress_activity</span>
                                    ) : (
                                        <>
                                            <span>Zaloguj się</span>
                                            <span
                                                className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    {/* Register Link */}
                    <div className="mt-8 text-center">
                        <p className="text-on-surface-variant text-sm">
                            Nie masz jeszcze konta?{' '}
                            <Link to="/register"
                                  className="font-bold text-primary hover:underline underline-offset-4 transition-all">
                                Zarejestruj się
                            </Link>
                        </p>
                    </div>
                    {/* "Footer" with information about system */}
                    <div className="mt-12 text-center space-y-4">
                        <p className="text-on-surface-variant text-xs opacity-70">Tylko dla osób powiązanych z
                            Politechniką Łódzką</p>
                    </div>
                </div>
            </main>
        </div>
    );
}