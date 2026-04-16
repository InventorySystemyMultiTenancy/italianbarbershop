import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Scissors } from "lucide-react";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const text = language === "ma"
    ? {
        minPassword: "Mot de passe khaso ykon fih 6 7orof 3la l9al",
        birthRequired: "3afak dkhel tarikh lmilad dyalek",
        registerError: "Khata2 f tsjil",
        success: "Tcreatea compte b nejah!",
        subtitle: "Sawb compte dyalek",
        fullName: "Smiya kamla",
        phone: "Téléphone",
        birthDate: "Tarikh lmilad",
        emailOptional: "Email (ikhtiyari)",
        password: "Mot de passe",
        passwordPlaceholder: "9ell men 6 7orof mamnouch",
        creating: "Kancreateiw compte...",
        register: "Sajjel",
        hasAccount: "3endek compte deja?",
        loginHere: "Dkhol mn hna",
      }
    : {
        minPassword: "La password deve avere almeno 6 caratteri",
        birthRequired: "Inserisci la tua data di nascita",
        registerError: "Errore durante la registrazione",
        success: "Account creato con successo!",
        subtitle: "Crea il tuo account",
        fullName: "Nome completo",
        phone: "Telefono",
        birthDate: "Data di nascita",
        emailOptional: "Email (opzionale)",
        password: "Password",
        passwordPlaceholder: "Minimo 6 caratteri",
        creating: "Creazione account...",
        register: "Registrati",
        hasAccount: "Hai gia un account?",
        loginHere: "Accedi qui",
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: text.minPassword, variant: "destructive" });
      return;
    }

    if (!birthDate) {
      toast({ title: text.birthRequired, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signUp({
      fullName,
      phone,
      birthDate,
      password,
      email: email || undefined,
    });
    setLoading(false);
    if (error) {
      toast({ title: text.registerError, description: error.message, variant: "destructive" });
    } else {
      toast({ title: text.success });
      navigate("/agendar");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Scissors className="h-8 w-8 text-primary" />
            <span className="font-heading text-3xl font-bold gold-text">Nome da sua barbearia</span>
          </Link>
          <p className="mt-3 text-muted-foreground">{text.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 glass p-8 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="fullName">{text.fullName}</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="João Silva" required className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{text.phone}</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" required className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">{text.birthDate}</Label>
            <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{text.emailOptional}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{text.password}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={text.passwordPlaceholder} required className="bg-muted/50" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? text.creating : text.register}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {text.hasAccount}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {text.loginHere}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
