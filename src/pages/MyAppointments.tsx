import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { Calendar, MessageCircle, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cancelMyAppointment, getFriendlyErrorMessage, getMyAppointments, type Appointment } from "@/lib/api";
import { BUSINESS_WHATSAPP_NUMBER, openWhatsAppMessage } from "@/lib/whatsapp";
import { toast } from "@/hooks/use-toast";

function formatMoney(value: number, currencyLocale: string) {
  return new Intl.NumberFormat(currencyLocale, {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function getDiscountPriceDetails(input: { base?: number; final?: number; percent?: number; fallback: number }) {
  const final = Number.isFinite(input.final as number) ? Number(input.final) : input.fallback;
  const baseFromRaw = Number.isFinite(input.base as number) ? Number(input.base) : undefined;
  const percent = Number.isFinite(input.percent as number) ? Number(input.percent) : undefined;

  if (baseFromRaw !== undefined) {
    return { base: baseFromRaw, final };
  }

  if (percent && percent > 0 && percent < 100) {
    const estimatedBase = final / (1 - percent / 100);
    return { base: estimatedBase, final };
  }

  return { base: final, final };
}

function parseLocalDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localDate = new Date(year, month - 1, day);
    if (!Number.isNaN(localDate.getTime())) return localDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatAppointmentDate(value: string, dateFnsLocale: Locale, invalidDateLabel: string) {
  const date = parseLocalDate(value);
  if (!date) return invalidDateLabel;
  return format(date, "EEEE, dd/MM", { locale: dateFnsLocale });
}

function formatAppointmentTime(value: string) {
  if (!value) return "--:--";
  return value.slice(0, 5);
}

function buildAppointmentWhatsAppMessage(appointment: Appointment, customerName?: string, mode: "scheduled" | "canceled" = "scheduled") {
  const serviceLabel = appointment.serviceLabel || "Servizio";
  const customerLabel = customerName || appointment.fullName || "Cliente";
  const actionLabel = mode === "canceled" ? "ha annullato l'appuntamento" : "ha prenotato un appuntamento";

  return [
    `O cliente ${customerLabel} ${actionLabel}.`,
    `Data: ${appointment.appointmentDate}`,
    `Hora: ${formatAppointmentTime(appointment.appointmentTime)}`,
    `Servico: ${serviceLabel}`,
    `Valor: ${appointment.price || 0}`,
  ].join("\n");
}

const MyAppointments = () => {
  const { user, loading: authLoading } = useAuth();
  const { language, dateFnsLocale, currencyLocale } = useLanguage();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const text = language === "it"
    ? {
        loadError: "Errore nel caricamento appuntamenti",
        whatsappError: "Impossibile aprire WhatsApp",
        whatsappErrorDesc: "Controlla se il browser ha bloccato l'apertura della nuova scheda.",
        cancelConfirm: "Vuoi annullare questo appuntamento?",
        canceled: "Appuntamento annullato",
        cancelError: "Errore durante l'annullamento",
        statusScheduled: "Prenotato",
        statusPaid: "Pagato",
        statusAvailable: "Disponibile",
        authLoading: "Caricamento autenticazione...",
        titleA: "I MIEI",
        titleB: "APPUNTAMENTI",
        subtitle: "Gestisci i tuoi orari",
        loading: "Caricamento...",
        empty: "Nessun appuntamento trovato",
        bookNow: "PRENOTA ORA",
        value: "Valore",
        birthdayDiscount: "Sconto compleanno applicato",
        original: "Originale",
        final: "Finale",
        sendWhatsApp: "Invia su WhatsApp",
        cancel: "Annulla",
        invalidDate: "Data non valida",
      }
    : {
        loadError: "Khata2 f t7mil lmawaid",
        whatsappError: "Ma9drnach n7ello WhatsApp",
        whatsappErrorDesc: "Chof ila lbrowser sedd 7ell tab jdida.",
        cancelConfirm: "Bghiti tlghi had lma3ad?",
        canceled: "Tlagha lma3ad",
        cancelError: "Khata2 f l2ilgha2",
        statusScheduled: "M7juz",
        statusPaid: "Mkhalles",
        statusAvailable: "Mota7",
        authLoading: "Kayt7emmel l2auth...",
        titleA: "MAWAIDI",
        titleB: "DYALI",
        subtitle: "Dabber lwa9t dyalek",
        loading: "Kayt7emmel...",
        empty: "Ma kayn 7tta ma3ad",
        bookNow: "HJZ DABA",
        value: "Taman",
        birthdayDiscount: "Tkhfida dyal 3id lmilad ttb9at",
        original: "L2asli",
        final: "L2akhiri",
        sendWhatsApp: "Sift l WhatsApp",
        cancel: "Lghi",
        invalidDate: "Tarikh ghalet",
      };

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await getMyAppointments();
      setAppointments(data);
    } catch (error) {
      toast({
        title: text.loadError,
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  const handleSendToWhatsApp = (appointment: Appointment, mode: "scheduled" | "canceled" = "scheduled") => {
    const message = buildAppointmentWhatsAppMessage(appointment, user?.fullName, mode);
    const opened = openWhatsAppMessage(message, BUSINESS_WHATSAPP_NUMBER);

    if (!opened) {
      toast({
        title: text.whatsappError,
        description: text.whatsappErrorDesc,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleCancel = async (appointment: Appointment) => {
    const confirmed = window.confirm(text.cancelConfirm);
    if (!confirmed) return;

    try {
      await cancelMyAppointment(appointment.id);
      toast({ title: text.canceled });
      handleSendToWhatsApp(appointment, "canceled");
      await loadAppointments();
    } catch (error) {
      toast({
        title: text.cancelError,
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      agendado: { label: text.statusScheduled, className: "bg-primary/20 text-primary" },
      pago: { label: text.statusPaid, className: "bg-green-500/20 text-green-400" },
      disponivel: { label: text.statusAvailable, className: "bg-muted text-muted-foreground" },
    };

    return map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{text.authLoading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-2xl px-4 pt-24 pb-16">
        <h1 className="font-heading text-3xl font-bold mb-2">
          {text.titleA} <span className="gold-text">{text.titleB}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{text.subtitle}</p>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">{text.loading}</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 glass rounded-lg">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{text.empty}</p>
            <Button onClick={() => navigate("/agendar")} className="font-heading">
              {text.bookNow}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const status = statusLabel(appointment.status);
              const discountPrices = getDiscountPriceDetails({
                base: appointment.discount?.basePrice,
                final: appointment.discount?.finalPrice,
                percent: appointment.discount?.discountPercent,
                fallback: appointment.price ?? 0,
              });

              return (
                <div key={appointment.id} className="glass rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading font-semibold">
                      {formatAppointmentDate(appointment.appointmentDate, dateFnsLocale, text.invalidDate)}
                    </p>
                    <p className="text-primary font-heading text-lg">{formatAppointmentTime(appointment.appointmentTime)}</p>
                    {appointment.serviceLabel && (
                      <p className="text-sm text-foreground/80 mt-1">{appointment.serviceLabel}</p>
                    )}
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-2">{text.value}: {formatMoney(appointment.price || 0, currencyLocale)}</p>
                    {appointment.discount?.applied && (
                      <div className="mt-2 rounded-md border border-primary/40 bg-primary/10 p-2">
                        <p className="text-xs font-semibold text-primary">{text.birthdayDiscount}</p>
                        {appointment.discount.message && (
                          <p className="text-xs text-muted-foreground mt-1">{appointment.discount.message}</p>
                        )}
                        <p className="text-xs text-foreground mt-1">
                          {text.original}: {formatMoney(discountPrices.base, currencyLocale)}
                        </p>
                        <p className="text-xs text-foreground">
                          {text.final}: {formatMoney(discountPrices.final, currencyLocale)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendToWhatsApp(appointment, "scheduled")}
                      className="gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {text.sendWhatsApp}
                    </Button>
                    {appointment.status !== "pago" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(appointment)}
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        {text.cancel}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAppointments;
