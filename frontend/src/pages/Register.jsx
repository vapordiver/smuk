import {useState} from 'react';
import {useNavigate, Link, useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

export default function Register() {
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', password: '', password_confirm: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const {register, login} = useAuth();
    const navigate = useNavigate();
    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.password_confirm) {
            return setError('Hasła nie są identyczne');
        }
        setIsLoading(true);
        try {
            await register(formData);
            await login(formData.email, formData.password);
            navigate('/');
        } catch (err) {
            const errorData = err.response?.data;
            let errorMessage = 'Wystąpił błąd podczas rejestracji.';
            if (errorData) {
                if (errorData.error && errorData.error.message) {
                    errorMessage = errorData.error.message;
                    if (errorData.error.details) {
                        errorMessage += ' ' + Object.values(errorData.error.details).flat().join(' ');
                    }
                } else if (typeof errorData === 'object') {
                    const messages = Object.values(errorData).flat();
                    if (messages.length > 0) {
                        errorMessage = messages.join(' ');
                    }
                }
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="bg-background text-on-background min-h-screen flex flex-col">
            <main className="flex-grow flex items-center justify-center p-6 py-12">
                <div
                    className="w-full max-w-[500px]">
                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-primary text-3xl">domain</span>
                            <h1 className="text-2xl font-bold tracking-tight text-on-surface">SMUK</h1>
                        </div>
                        <h2 className="text-2xl font-bold text-on-surface text-center mb-4">Załóż konto</h2>
                        <p className="text-on-surface-variant text-sm mt-1 text-center">Dołącz do uczelnianej sieci
                            zarządzania usterkami</p>
                    </div>
                    {/* Register Form Card */}
                    <div className="bg-white border border-outline rounded-xl p-8 shadow-sm">
                        {/* Error Message */}
                        {error && (
                            <div
                                className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">error</span>
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Row: First Name & Last Name */}
                            <div className="flex flex-col sm:flex-row gap-5">
                                <div className="space-y-2 flex-1">
                                    <label
                                        className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Imię</label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span
                                                className="material-symbols-outlined text-on-surface-variant text-xl">person</span>
                                        </div>
                                        <input type="text" name="first_name" required onChange={handleChange}
                                               placeholder="Jan"
                                               className="w-full pl-11 pr-4 py-3 bg-[#f6f6f8] border-transparent focus:border-primary focus:ring-0 rounded-xl text-on-surface transition-all duration-200 outline-none placeholder:text-on-surface-variant/40"/>
                                    </div>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <label
                                        className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Nazwisko</label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span
                                                className="material-symbols-outlined text-on-surface-variant text-xl">badge</span>
                                        </div>
                                        <input type="text" name="last_name" required onChange={handleChange}
                                               placeholder="Kowalski"
                                               className="w-full pl-11 pr-4 py-3 bg-[#f6f6f8] border-transparent focus:border-primary focus:ring-0 rounded-xl text-on-surface transition-all duration-200 outline-none placeholder:text-on-surface-variant/40"/>
                                    </div>
                                </div>
                            </div>
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label
                                    className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Email
                                    uczelniany</label>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span
                                            className="material-symbols-outlined text-on-surface-variant text-xl">alternate_email</span>
                                    </div>
                                    <input type="email" name="email" required onChange={handleChange}
                                           placeholder="student@edu.p.lodz.pl"
                                           className="w-full pl-11 pr-4 py-3 bg-[#f6f6f8] border-transparent focus:border-primary focus:ring-0 rounded-xl text-on-surface transition-all duration-200 outline-none placeholder:text-on-surface-variant/40"/>
                                </div>
                                <p className="text-[11px] text-on-surface-variant/70 ml-1">Wymagana domena
                                    @edu.p.lodz.pl lub @p.lodz.pl</p>
                            </div>
                            {/* Password Field */}
                            <div className="space-y-2">
                                <label
                                    className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Hasło</label>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span
                                            className="material-symbols-outlined text-on-surface-variant text-xl">lock_open</span>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-12 py-3 bg-[#f6f6f8] border-transparent focus:border-primary focus:ring-0 rounded-xl text-on-surface transition-all duration-200 outline-none placeholder:text-on-surface-variant/40"
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
                                <p className="text-[11px] text-on-surface-variant/70 ml-1">Min. 8 znaków, nie może
                                    składać się z samych cyfr ani być zbyt popularne.</p>
                            </div>
                            {/* Confirm Password Field */}
                            <div className="space-y-2">
                                <label
                                    className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Powtórz
                                    hasło</label>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span
                                            className="material-symbols-outlined text-on-surface-variant text-xl">lock</span>
                                    </div>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="password_confirm"
                                        required
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-12 py-3 bg-[#f6f6f8] border-transparent focus:border-primary focus:ring-0 rounded-xl text-on-surface transition-all duration-200 outline-none placeholder:text-on-surface-variant/40"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                    >
                                        <span
                                            className="material-symbols-outlined text-xl">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>
                            {/* Action Button */}
                            <div className="pt-4">
                                <button type="submit" disabled={isLoading}
                                        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-[0.98] active:scale-[0.95] transition-all duration-200 flex justify-center items-center gap-2 group disabled:opacity-70 disabled:hover:scale-100">
                                    {isLoading ? (
                                        <span
                                            className="material-symbols-outlined animate-spin">progress_activity</span>
                                    ) : (
                                        <>
                                            <span>Zarejestruj się</span>
                                            <span
                                                className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    {/* Login Link */}
                    <div className="mt-8 text-center">
                        <p className="text-on-surface-variant text-sm">
                            Masz już konto?{' '}
                            <Link to="/login"
                                  className="font-bold text-primary hover:underline underline-offset-4 transition-all">
                                Zaloguj się
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