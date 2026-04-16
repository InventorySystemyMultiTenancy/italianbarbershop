import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format, startOfToday } from "date-fns";
import type { Locale } from "date-fns";
import { CalendarDays, CheckCircle2, Clock, Gift } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ApiClientError,
  type Barber,
  createAppointment,
  getBarbers,
  getAppointmentServices,
  getFriendlyErrorMessage,
  getSlotsByDate,
  type Appointment,
  type AppointmentService,
  type AppointmentSlot,
  type SlotsMeta,
} from "@/lib/api";
import { BUSINESS_WHATSAPP_NUMBER, openWhatsAppMessage } from "@/lib/whatsapp";
import { toast } from "@/hooks/use-toast";

function parseLocalDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMoney(value: number, currencyLocale: string) {
  return new Intl.NumberFormat(currencyLocale, {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function getDefaultBookingWindow() {
  const today = startOfToday();
  return {
    start: format(today, "yyyy-MM-dd"),
    end: format(addDays(today, 15), "yyyy-MM-dd"),
  };
}

function isDateWithinWindow(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function normalizeServiceToken(value?: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function serviceMatchesDiscount(
  selectedKey?: string,
  discountServiceType?: string,
) {
  const selected = normalizeServiceToken(selectedKey);
  const discountType = normalizeServiceToken(discountServiceType);

  if (!selected) return false;
  if (!discountType) return true;
  return (
    selected === discountType ||
    selected.includes(discountType) ||
    discountType.includes(selected)
  );
}

function isBirthdayToday(dateText?: string) {
  if (!dateText) return false;

  const parts = dateText.slice(0, 10).split("-");
  if (parts.length !== 3) return false;

  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const now = new Date();

  return month === now.getMonth() + 1 && day === now.getDate();
}

function logBookingDebug(step: string, payload: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;

  console.group(`[BOOKING_DEBUG] ${step}`);
  Object.entries(payload).forEach(([key, value]) => {
    console.log(`${key}:`, value);
  });
  console.groupEnd();
}

const Booking = () => {
  const { user, birthdayDiscount, loading: authLoading } = useAuth();
  const { language, dateFnsLocale, currencyLocale, t } = useLanguage();
  const navigate = useNavigate();
  const defaultWindow = getDefaultBookingWindow();
  const [selectedDate, setSelectedDate] = useState<string>(defaultWindow.start);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsMeta, setSlotsMeta] = useState<SlotsMeta>({});
  const [bookingWindowStart, setBookingWindowStart] = useState(
    defaultWindow.start,
  );
  const [bookingWindowEnd, setBookingWindowEnd] = useState(defaultWindow.end);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedServiceKey, setSelectedServiceKey] = useState("");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barbersLoading, setBarbersLoading] = useState(false);
  const [barbersError, setBarbersError] = useState<string | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [lastDiscountSummary, setLastDiscountSummary] = useState<{
    applied: boolean;
    message?: string;
    basePrice?: number;
    finalPrice?: number;
    discountPercent?: number;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const availableDates = useMemo(() => {
    const start = parseLocalDate(bookingWindowStart);
    const end = parseLocalDate(bookingWindowEnd);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start
    ) {
      return [] as Date[];
    }

    const days =
      Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return Array.from({ length: days }, (_, i) => addDays(start, i));
  }, [bookingWindowStart, bookingWindowEnd]);

  const loadSlots = async (date: string) => {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      if (!date) {
        setSlots([]);
        setSlotsMeta({});
        setSelectedTime("");
        return;
      }

      if (!selectedBarberId) {
        setSlots([]);
        setSlotsMeta({});
        setSelectedTime("");
        return;
      }

      if (!isDateWithinWindow(date, bookingWindowStart, bookingWindowEnd)) {
        setSlots([]);
        setSelectedTime("");
        setSlotsError("Data fora da janela de agendamento.");
        return;
      }

      const response = await getSlotsByDate(date, selectedBarberId);
      setSlots(response.slots);
      setSlotsMeta(response.meta || {});

      const nextWindowStart =
        response.meta?.bookingWindowStart || bookingWindowStart;
      const nextWindowEnd = response.meta?.bookingWindowEnd || bookingWindowEnd;
      setBookingWindowStart(nextWindowStart);
      setBookingWindowEnd(nextWindowEnd);

      if (!isDateWithinWindow(date, nextWindowStart, nextWindowEnd)) {
        setSelectedDate(nextWindowStart);
        setSelectedTime("");
        setSlots([]);
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        toast({
          title: t("booking_expired_title", "Sessione scaduta"),
          description: t(
            "booking_expired_desc",
            "Accedi di nuovo per continuare.",
          ),
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 500) {
        setSlotsError("Erro interno ao carregar horarios. Tente novamente.");
      } else if (error instanceof ApiClientError && error.status === 400) {
        setSlotsError(error.message || "Dados invalidos para buscar horarios.");
      } else {
        setSlotsError("Falha ao carregar horarios.");
      }

      setSlots([]);
      setSlotsMeta({});
      toast({
        title: "Falha ao carregar horarios",
        description:
          error instanceof ApiClientError && error.status === 500
            ? "Erro interno do servidor. Use Tentar novamente."
            : getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  const loadServices = async () => {
    setServicesLoading(true);
    try {
      const catalog = await getAppointmentServices();
      setServices(catalog);

      if (
        selectedServiceKey &&
        !catalog.some((service) => service.key === selectedServiceKey)
      ) {
        setSelectedServiceKey("");
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        toast({
          title: t("booking_expired_title", "Sessione scaduta"),
          description: t(
            "booking_expired_desc",
            "Accedi di nuovo per continuare.",
          ),
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      setServices([]);
      setSelectedServiceKey("");
      toast({
        title: "Falha ao carregar servicos",
        description:
          error instanceof ApiClientError && error.status === 500
            ? "Erro interno do servidor. Tente novamente."
            : getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setServicesLoading(false);
    }
  };

  const loadBarbers = async () => {
    setBarbersLoading(true);
    setBarbersError(null);

    try {
      const data = await getBarbers(true);
      setBarbers(data);

      const hasSelected = data.some(
        (barber) => barber.id === selectedBarberId && barber.isActive,
      );
      if (!hasSelected) {
        const firstActive = data.find((barber) => barber.isActive);
        setSelectedBarberId(firstActive?.id || "");
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        toast({
          title: t("booking_expired_title", "Sessione scaduta"),
          description: t(
            "booking_expired_desc",
            "Accedi di nuovo per continuare.",
          ),
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      setBarbers([]);
      setSelectedBarberId("");
      setBarbersError(getFriendlyErrorMessage(error));
    } finally {
      setBarbersLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate || !user) return;

    if (
      !isDateWithinWindow(selectedDate, bookingWindowStart, bookingWindowEnd)
    ) {
      setSelectedDate(bookingWindowStart);
      return;
    }

    setSelectedTime("");
    setLastDiscountSummary(null);
    if (!selectedBarberId) {
      setSlots([]);
      setSlotsMeta({});
      return;
    }

    loadSlots(selectedDate);
  }, [
    selectedDate,
    user,
    bookingWindowStart,
    bookingWindowEnd,
    selectedBarberId,
  ]);

  useEffect(() => {
    if (!user) return;
    loadServices();
    loadBarbers();
  }, [user]);

  const selectedService =
    services.find((service) => service.key === selectedServiceKey) || null;
  const selectedBarber =
    barbers.find((barber) => barber.id === selectedBarberId) || null;
  const birthdayPercent =
    birthdayDiscount.discountPercent && birthdayDiscount.discountPercent > 0
      ? birthdayDiscount.discountPercent
      : 50;
  const birthdayEligibleToday = isBirthdayToday(user?.birthDate);
  const hasBirthdayPromoGlobally = Boolean(
    birthdayDiscount.active ||
    ((birthdayDiscount.discountPercent ?? 0) > 0 && birthdayEligibleToday),
  );
  const hasBirthdayDiscountForSelectedService =
    hasBirthdayPromoGlobally &&
    Boolean(selectedServiceKey) &&
    serviceMatchesDiscount(selectedServiceKey, birthdayDiscount.serviceType);

  const getDiscountedPrice = (basePrice: number) => {
    const safeBase = Number(basePrice || 0);
    return safeBase - safeBase * (birthdayPercent / 100);
  };

  const getAppointmentSummary = (appointment: Appointment) => {
    const serviceLabel =
      appointment.serviceLabel ||
      selectedService?.label ||
      selectedServiceKey ||
      "Servico";
    const servicePrice = Number.isFinite(appointment.price)
      ? appointment.price
      : (selectedService?.price ?? 0);
    const dateValue = appointment.appointmentDate || selectedDate;
    const timeValue = appointment.appointmentTime || selectedTime;

    return {
      serviceLabel,
      servicePrice,
      dateValue,
      timeValue,
    };
  };

  const handleBook = async () => {
    if (
      !selectedServiceKey ||
      !selectedBarberId ||
      !selectedDate ||
      !selectedTime
    ) {
      toast({
        title: "Preencha os campos obrigatorios",
        description:
          "Selecione servico, barbeiro, data e horario para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (
      !isDateWithinWindow(selectedDate, bookingWindowStart, bookingWindowEnd)
    ) {
      toast({
        title: "Data fora da janela de agendamento",
        description: `Escolha uma data entre ${bookingWindowStart} e ${bookingWindowEnd}.`,
        variant: "destructive",
      });
      return;
    }

    logBookingDebug("BOOK_CLICKED", {
      selectedDate,
      selectedTime,
      selectedBarberId,
      selectedServiceType: selectedServiceKey,
      bookingWindowStart,
      bookingWindowEnd,
      timezone: slotsMeta.timezone,
    });

    setSubmitting(true);
    try {
      const latestByBarber = await getSlotsByDate(
        selectedDate,
        selectedBarberId,
      );
      setSlots(latestByBarber.slots);
      setSlotsMeta(latestByBarber.meta || {});

      const nextWindowStart =
        latestByBarber.meta?.bookingWindowStart || bookingWindowStart;
      const nextWindowEnd =
        latestByBarber.meta?.bookingWindowEnd || bookingWindowEnd;
      setBookingWindowStart(nextWindowStart);
      setBookingWindowEnd(nextWindowEnd);

      if (!isDateWithinWindow(selectedDate, nextWindowStart, nextWindowEnd)) {
        toast({
          title: "Data fora da janela de agendamento",
          description: `Escolha uma data entre ${nextWindowStart} e ${nextWindowEnd}.`,
          variant: "destructive",
        });
        setSelectedDate(nextWindowStart);
        setSelectedTime("");
        return;
      }

      logBookingDebug("PREFLIGHT_SLOTS", {
        selectedDate,
        selectedTime,
        selectedBarberId,
        totalSlots: latestByBarber.slots.length,
        selectedSlot:
          latestByBarber.slots.find((slot) => slot.time === selectedTime) ||
          null,
      });

      const selectedSlot = latestByBarber.slots.find(
        (slot) => slot.time === selectedTime,
      );
      if (!selectedSlot || selectedSlot.status !== "disponivel") {
        setSelectedTime("");
        toast({
          title: "Horario nao disponivel",
          description:
            "Atualizamos os horarios em tempo real. Escolha outro horario disponivel.",
          variant: "destructive",
        });
        return;
      }

      logBookingDebug("POST_APPOINTMENT_REQUEST", {
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        service_type: selectedServiceKey,
        barber_id: selectedBarberId,
      });

      const createdAppointment = await createAppointment({
        date: selectedDate,
        time: selectedTime,
        serviceType: selectedServiceKey,
        barberId: selectedBarberId,
        paymentMethod: "manual",
      });

      const summary = getAppointmentSummary(createdAppointment);
      const discount = createdAppointment.discount;

      logBookingDebug("POST_APPOINTMENT_SUCCESS", {
        selectedDate,
        selectedTime,
        serviceType: createdAppointment.serviceType || selectedServiceKey,
        serviceLabel: createdAppointment.serviceLabel || summary.serviceLabel,
        price: createdAppointment.price,
      });

      toast({
        title: "Agendamento confirmado!",
        description: `${summary.serviceLabel} • ${formatMoney(summary.servicePrice, currencyLocale)} • ${summary.dateValue} ${summary.timeValue.slice(0, 5)}`,
      });

      if (discount?.applied) {
        setLastDiscountSummary({
          applied: true,
          message: discount.message,
          basePrice: discount.basePrice,
          finalPrice: discount.finalPrice,
          discountPercent: discount.discountPercent,
        });

        toast({
          title: "Desconto de aniversario aplicado",
          description:
            discount.message ||
            `${t("booking_original_price", "Prezzo originale")} ${formatMoney(discount.basePrice || summary.servicePrice, currencyLocale)} • ${t("booking_final_price", "Prezzo finale")} ${formatMoney(discount.finalPrice || summary.servicePrice, currencyLocale)}`,
        });
      } else {
        if (hasBirthdayDiscountForSelectedService && selectedService) {
          setLastDiscountSummary({
            applied: true,
            message: "Desconto de aniversario aplicado no corte.",
            basePrice: selectedService.price,
            finalPrice: getDiscountedPrice(selectedService.price),
            discountPercent: birthdayPercent,
          });
        } else {
          setLastDiscountSummary(null);
        }
      }

      const bookingWhatsAppMessage = [
        `Olá! Meu nome é ${user?.fullName || "Cliente"}.`,
        "Acabei de agendar um horário.",
        `Data: ${summary.dateValue}`,
        `Hora: ${summary.timeValue.slice(0, 5)}`,
        `Serviço: ${summary.serviceLabel}`,
      ].join("\n");

      const openedWhatsApp = openWhatsAppMessage(
        bookingWhatsAppMessage,
        BUSINESS_WHATSAPP_NUMBER || undefined,
      );
      if (!openedWhatsApp) {
        toast({
          title: "Nao foi possivel abrir o WhatsApp automaticamente",
          description:
            "Verifique se o navegador bloqueou pop-up e tente novamente.",
          variant: "destructive",
        });
      }

      await loadSlots(selectedDate);
      navigate("/meus-agendamentos");
    } catch (error) {
      if (error instanceof ApiClientError) {
        logBookingDebug("POST_APPOINTMENT_ERROR", {
          status: error.status,
          code: error.code || null,
          message: error.message,
          details: error.details || null,
          selectedDate,
          selectedTime,
        });
      } else {
        logBookingDebug("POST_APPOINTMENT_ERROR_UNKNOWN", {
          error,
          selectedDate,
          selectedTime,
        });
      }

      if (error instanceof ApiClientError && error.status === 401) {
        toast({
          title: t("booking_expired_title", "Sessione scaduta"),
          description: t("booking_expired_desc", "Accedi di nuovo per continuare."),
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (
        error instanceof ApiClientError &&
        (error.status === 409 || error.code === "SLOT_ALREADY_BOOKED")
      ) {
        setSelectedTime("");
        await loadSlots(selectedDate);

        toast({
          title: "Horario indisponivel",
          description:
            "Este horario acabou de ser reservado. Escolha outro horario.",
          variant: "destructive",
        });
        return;
      }

      if (
        error instanceof ApiClientError &&
        error.status === 400 &&
        error.code === "INVALID_SERVICE_TYPE"
      ) {
        setSelectedServiceKey("");
        await loadServices();
        toast({
          title: "Servico invalido",
          description:
            "O servico selecionado nao e mais valido. Recarregamos o catalogo para voce selecionar novamente.",
          variant: "destructive",
        });
        return;
      }

      if (error instanceof ApiClientError && error.status === 400) {
        const rawMessage = (error.message || "").toLowerCase();
        const isWindowValidation =
          (error.code || "").toLowerCase().includes("window") ||
          rawMessage.includes("janela") ||
          rawMessage.includes("window");

        const message =
          isWindowValidation && bookingWindowStart && bookingWindowEnd
            ? `Data fora da janela de agendamento. Escolha uma data entre ${bookingWindowStart} e ${bookingWindowEnd}.`
            : error.message || "Dados invalidos para concluir o agendamento.";

        toast({
          title: "Nao foi possivel confirmar o agendamento",
          description: message,
          variant: "destructive",
        });
        return;
      }

      if (error instanceof ApiClientError && error.status === 500) {
        toast({
          title: "Erro interno",
          description: "Nao foi possivel concluir agora. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Erro ao agendar",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">
          {t("booking_auth_loading", "Caricamento autenticazione...")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-2xl px-4 pt-24 pb-16">
        <h1 className="font-heading text-3xl font-bold mb-2">
          {t("booking_title_a", "PRENOTA")} <span className="gold-text">{t("booking_title_b", "ORARIO")}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t("booking_subtitle", "Scegli giorno e orario del tuo taglio")}</p>
        <p className="text-sm text-muted-foreground mb-8">
          {t("booking_window_prefix", "Prenotazioni disponibili da")}{" "}
          {format(parseLocalDate(bookingWindowStart), "dd/MM")}{" "}
          {t("booking_window_middle", "a")}{" "}
          {format(parseLocalDate(bookingWindowEnd), "dd/MM")}.
        </p>

        {hasBirthdayPromoGlobally && (
          <div className="mb-6 glass rounded-lg border border-primary/40 bg-primary/10 p-4">
            <div className="inline-flex items-center gap-2 text-primary font-semibold">
              <Gift className="h-4 w-4" /> {t("booking_birthday_promo_active", "Promo compleanno attiva")}
            </div>
            <p className="text-sm text-foreground mt-1">
              {birthdayDiscount.message || t("booking_birthday_promo_fallback", "Hai uno sconto compleanno sul servizio idoneo.")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("booking_discount_label", "Sconto")}:{" "}
              {birthdayDiscount.discountPercent
                ? `${birthdayDiscount.discountPercent}%`
                : "50%"}
              {birthdayDiscount.serviceType
                ? ` no servico ${birthdayDiscount.serviceType}`
                : ""}
            </p>
          </div>
        )}

        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">
              {t("booking_choose_service", "Scegli il servizio")}
            </h2>
          </div>

          {servicesLoading ? (
            <p className="text-muted-foreground">{t("booking_loading_services", "Caricamento servizi...")}</p>
          ) : services.length === 0 ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground">
              {t("booking_no_services", "Nessun servizio disponibile nel catalogo.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((service) => {
                const isSelected = selectedServiceKey === service.key;
                const serviceHasBirthdayPromo =
                  hasBirthdayPromoGlobally &&
                  serviceMatchesDiscount(
                    service.key,
                    birthdayDiscount.serviceType,
                  );
                const discountedPrice = getDiscountedPrice(service.price);
                return (
                  <button
                    key={service.key}
                    onClick={() => setSelectedServiceKey(service.key)}
                    className={`rounded-lg p-4 text-left transition-all border ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <p className="font-heading font-semibold">
                      {service.label}
                    </p>
                    {serviceHasBirthdayPromo ? (
                      <div className="mt-1">
                        <p className="text-xs text-muted-foreground line-through">
                          {formatMoney(service.price, currencyLocale)}
                        </p>
                        <p className="text-sm text-primary font-semibold">
                          {formatMoney(discountedPrice, currencyLocale)} (
                          {birthdayPercent}% {t("booking_birthday_off_suffix", "OFF compleanno")})
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(service.price, currencyLocale)}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">
              {t("booking_choose_barber", "Scegli il barbiere")}
            </h2>
          </div>

          {barbersLoading ? (
            <p className="text-muted-foreground">{t("booking_loading_barbers", "Caricamento barbieri...")}</p>
          ) : barbersError ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground space-y-3">
              <p>{barbersError}</p>
              <Button variant="outline" onClick={loadBarbers}>
                {t("booking_retry", "Riprova")}
              </Button>
            </div>
          ) : barbers.length === 0 ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground">
              {t("booking_no_barbers", "Nessun barbiere registrato.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {barbers.map((barber) => {
                const isSelected = selectedBarberId === barber.id;

                return (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => {
                      setSelectedBarberId(barber.id);
                      setSelectedTime("");
                      setSlots([]);
                      setSlotsMeta({});
                    }}
                    className={`rounded-lg p-4 text-left transition-all border ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {barber.imageUrl ? (
                        <img
                          src={barber.imageUrl}
                          alt={barber.fullName}
                          className="h-12 w-12 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full border border-border bg-muted flex items-center justify-center text-xs">
                          {t("booking_no_photo", "Senza foto")}
                        </div>
                      )}
                      <div>
                        <p className="font-heading font-semibold">
                          {barber.fullName}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">
              {t("booking_choose_day", "Scegli il giorno")}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {availableDates.map((d) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setSelectedTime("");
                    setSlots([]);
                    setSlotsMeta({});
                  }}
                  className={`rounded-lg p-3 text-center transition-all border ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="font-heading text-sm font-semibold uppercase">
                    {format(d, "EEE", { locale: dateFnsLocale })}
                  </div>
                  <div className="text-lg font-bold">{format(d, "dd")}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(d, "MMM", { locale: dateFnsLocale })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">
              {t("booking_available_times", "Orari disponibili")}
            </h2>
          </div>

          {!selectedBarberId ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground">
              {t("booking_select_barber", "Seleziona un barbiere.")}
            </div>
          ) : slotsLoading ? (
            <p className="text-muted-foreground">{t("booking_loading_slots", "Caricamento orari...")}</p>
          ) : slotsError ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground space-y-3">
              <p>{slotsError}</p>
              <Button variant="outline" onClick={() => loadSlots(selectedDate)}>
                {t("booking_retry", "Riprova")}
              </Button>
            </div>
          ) : slots.length === 0 ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground">
              {t("booking_no_slots", "Nessun orario disponibile per questa data.")}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const disabled = slot.status !== "disponivel";
                const isSelected = selectedTime === slot.time;
                const statusLabel =
                  slot.status === "pago"
                    ? t("booking_slot_paid", "Pagato")
                    : slot.status === "agendado"
                      ? t("booking_slot_scheduled", "Prenotato")
                      : slot.status === "desabilitado"
                        ? t("booking_slot_disabled", "Disabilitato")
                        : t("booking_slot_available", "Disponibile");
                const reasonLabel =
                  slot.status === "desabilitado" && slot.reason
                    ? slot.reason
                    : null;

                return (
                  <button
                    key={`${slot.time}-${slot.status}-${slot.reason || ""}`}
                    disabled={disabled}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`rounded-lg p-3 text-center transition-all border font-heading ${
                      disabled
                        ? "border-border bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                        : isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div>{slot.time.slice(0, 5)}</div>
                    <div className="text-[10px] mt-1">{statusLabel}</div>
                    {reasonLabel && (
                      <div className="text-[10px] mt-1 opacity-80">
                        {reasonLabel}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedDate && selectedTime && (
          <div className="animate-fade-in glass rounded-lg p-6">
            <div className="flex items-start gap-3 w-full">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <div className="w-full">
                <p className="font-heading font-semibold">
                  {format(parseLocalDate(selectedDate), "EEEE, dd MMMM", {
                    locale: dateFnsLocale,
                  })}
                </p>
                <p className="text-primary font-heading text-lg">
                  {selectedTime.slice(0, 5)}
                </p>
                {selectedBarber && (
                  <p className="text-xs text-muted-foreground">
                    {t("booking_barber_label", "Barbiere")}: {selectedBarber.fullName}
                  </p>
                )}
                {selectedService && (
                  <div className="text-sm text-muted-foreground">
                    <p>{selectedService.label}</p>
                    {hasBirthdayDiscountForSelectedService ? (
                      <p>
                        <span className="line-through opacity-80 mr-2">
                          {formatMoney(selectedService.price, currencyLocale)}
                        </span>
                        <span className="text-primary font-semibold">
                          {formatMoney(
                            getDiscountedPrice(selectedService.price),
                            currencyLocale,
                          )}
                        </span>
                      </p>
                    ) : (
                      <p>
                        {formatMoney(selectedService.price, currencyLocale)}
                      </p>
                    )}
                  </div>
                )}

                {selectedService && hasBirthdayDiscountForSelectedService && (
                  <p className="text-xs text-primary mt-1">
                    {t(
                      "booking_birthday_will_apply",
                      "Lo sconto compleanno verra applicato a questo servizio.",
                    )}
                  </p>
                )}

                {lastDiscountSummary?.applied && (
                  <div className="mt-2 rounded-md border border-primary/40 bg-primary/10 p-2">
                    <p className="text-sm font-semibold text-primary">
                      {t("booking_birthday_applied", "Sconto compleanno applicato")}
                    </p>
                    {lastDiscountSummary.message && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {lastDiscountSummary.message}
                      </p>
                    )}
                    <p className="text-xs text-foreground mt-1">
                      {t("booking_original_price", "Prezzo originale")}:{" "}
                      {formatMoney(
                        lastDiscountSummary.basePrice ||
                          selectedService?.price ||
                          0,
                        currencyLocale,
                      )}
                    </p>
                    <p className="text-xs text-foreground">
                      {t("booking_final_price", "Prezzo finale")}:{" "}
                      {formatMoney(
                        lastDiscountSummary.finalPrice ||
                          selectedService?.price ||
                          0,
                        currencyLocale,
                      )}
                    </p>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("booking_payment_method", "Metodo di pagamento")}
                  </p>
                  <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                    {t("booking_in_person_payment", "Pagamento in presenza in barberia")}
                  </div>

                  <Button
                    onClick={handleBook}
                    disabled={
                      submitting ||
                      !selectedServiceKey ||
                      !selectedBarberId ||
                      !selectedDate ||
                      !selectedTime
                    }
                    className="font-heading w-full mt-2"
                  >
                    {submitting ? t("booking_submitting", "Prenotazione...") : t("booking_confirm", "CONFERMA PRENOTAZIONE")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;
