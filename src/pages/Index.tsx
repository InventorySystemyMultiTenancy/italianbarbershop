import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, Clock, CalendarDays, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import heroImage from "@/assets/hero-barbershop.jpg";
import logoImage from "@/assets/Chincoa Cort's logo.png";

function isBirthdayToday(dateText?: string) {
  if (!dateText) return false;
  const parts = dateText.slice(0, 10).split("-");
  if (parts.length !== 3) return false;

  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const now = new Date();

  return month === now.getMonth() + 1 && day === now.getDate();
}

const Index = () => {
  const { user, birthdayDiscount, refreshSession } = useAuth();
  const { language } = useLanguage();
  const text = language === "ma"
    ? {
        birthdayTitle: "Mabrouk! Tkhfida dyal 3id lmilad khdama",
        birthdayFallback: "3endek 50% f l9assa lyoum.",
        birthdayPercentSuffix: "f l9assa lyoum",
        premiumBarber: "7ella9 premium",
        heroTitleA: "STYLE LI",
        heroTitleB: "KAY3ARFK",
        heroSubtitle: "Tajriba premium f l9assa dyal rjal. Hjz online w dmen lwa9t dyalek.",
        bookNow: "HJZ DABA",
        servicesA: "KHADAMATNA",
        servicesB: "LKAMLIN",
        ctaA: "WAJED L",
        ctaB: "L9ASSA DYALK",
        ctaSubtitle: "Sajjel w hjz lwa9t dyalek f chi tawani.",
        startNow: "BDA DABA",
        footer: "© 2026 Nome da sua barbearia. Ga3 l7oukou9 ma7foda.",
        services: [
          { title: "L9assa dyal rjal", desc: "L9assa 3la 7sab style dyalek b tari9a 3asriya", price: "R$ 50" },
          { title: "3inaya b l7ya", desc: "3inaya m3a finition m7tarfa", price: "R$ 40" },
          { title: "L9assa & L7ya", desc: "Pack kamel l9assa m3a l7ya", price: "R$ 85" },
        ],
      }
    : {
        birthdayTitle: "Auguri! Sconto compleanno attivo",
        birthdayFallback: "Hai il 50% sul taglio oggi.",
        birthdayPercentSuffix: "sul taglio oggi",
        premiumBarber: "Barberia Premium",
        heroTitleA: "STILE CHE",
        heroTitleB: "TI DEFINISCE",
        heroSubtitle: "Esperienza premium nel taglio maschile. Prenota online e blocca il tuo orario.",
        bookNow: "PRENOTA ORA",
        servicesA: "I NOSTRI",
        servicesB: "SERVIZI",
        ctaA: "PRONTO PER IL",
        ctaB: "TUO TAGLIO",
        ctaSubtitle: "Registrati e prenota il tuo orario in pochi secondi.",
        startNow: "INIZIA ORA",
        footer: "© 2026 Nome da sua barbearia. Tutti i diritti riservati.",
        services: [
          { title: "Taglio Uomo", desc: "Taglio personalizzato con tecniche moderne", price: "R$ 50" },
          { title: "Barboterapia", desc: "Cura e finitura professionale della barba", price: "R$ 40" },
          { title: "Taglio & Barba", desc: "Combo completo taglio + barba", price: "R$ 85" },
        ],
      };
  const hasBirthdayPromo = Boolean(
    birthdayDiscount.active || ((birthdayDiscount.discountPercent ?? 0) > 0 && isBirthdayToday(user?.birthDate)),
  );

  useEffect(() => {
    if (user) {
      refreshSession();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in">
          {user && hasBirthdayPromo && (
            <div className="mb-4 glass rounded-lg border border-primary/40 bg-primary/10 p-4 text-left sm:text-center">
              <div className="inline-flex items-center gap-2 text-primary font-semibold">
                <Gift className="h-4 w-4" />
                {text.birthdayTitle}
              </div>
              <p className="text-sm text-foreground mt-2">{birthdayDiscount.message || text.birthdayFallback}</p>
              <p className="text-sm font-semibold text-primary mt-1">
                {birthdayDiscount.discountPercent ? `${birthdayDiscount.discountPercent}% ${text.birthdayPercentSuffix}` : `50% ${text.birthdayPercentSuffix}`}
              </p>
            </div>
          )}

          <img
            src={logoImage}
            alt="Logo Nome da sua barbearia"
            className="h-20 w-20 md:h-24 md:w-24 object-contain mx-auto mb-2"
          />

          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-primary/30 bg-primary/10">
            <Scissors className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">{text.premiumBarber}</span>
          </div>
          
          <h1 className="font-heading text-5xl md:text-7xl font-bold mb-6 leading-tight">
            {text.heroTitleA}<br />
            <span className="gold-text">{text.heroTitleB}</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            {text.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={user ? "/agendar" : "/cadastro"}>
              <Button size="lg" className="text-lg px-8 py-6 font-heading">
                {text.bookNow}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-16">
            {text.servicesA} <span className="gold-text">{text.servicesB}</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Scissors, ...text.services[0] },
              { icon: Clock, ...text.services[1] },
              { icon: CalendarDays, ...text.services[2] },
            ].map((service, i) => (
              <div
                key={service.title}
                className="glass rounded-lg p-8 text-center hover:border-primary/30 transition-all duration-300 group"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <service.icon className="h-10 w-10 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-heading text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{service.desc}</p>
                <span className="font-heading text-2xl font-bold text-primary">{service.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="font-heading text-3xl font-bold mb-4">
            {text.ctaA} <span className="gold-text">{text.ctaB}</span>?
          </h2>
          <p className="text-muted-foreground mb-8">
            {text.ctaSubtitle}
          </p>
          <Link to={user ? "/agendar" : "/cadastro"}>
            <Button size="lg" className="font-heading text-lg px-8">
              {user ? text.bookNow : text.startNow}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>{text.footer}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
