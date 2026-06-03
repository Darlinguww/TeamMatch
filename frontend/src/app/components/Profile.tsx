import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Briefcase, Star, Clock, Plus, X, Edit2, Save, Award, TrendingUp, Target, Upload, Sparkles, AlertCircle } from "lucide-react";
import { type Skill } from "../lib/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useAuth } from "../lib/authContext";
import { profileApi, type ApiAvailabilityDay } from "../lib/profileApi";
import { hasBackendSession, parseAvailabilityFromInput, suggestSkillsFromInput } from "../lib/aiFeatures";
import { SKILL_SUGGESTIONS } from "../lib/skillCatalog";
import { skillCategoryColors } from "../lib/badgeStyles";
import { toast } from "sonner";

const skillCategories = {
  technical: { label: "Técnicas",  color: skillCategoryColors.technical },
  soft:      { label: "Blandas",   color: skillCategoryColors.soft      },
  language:  { label: "Idiomas",   color: skillCategoryColors.language},
  domain:    { label: "Área de conocimiento", color: skillCategoryColors.domain },
};

const skillLevels = {
  beginner:     { bars: 1 },
  intermediate: { bars: 2 },
  advanced:     { bars: 3 },
  expert:       { bars: 4 },
};

const formatAvailabilityDay = (day: ApiAvailabilityDay) =>
  `${day.day} ${day.timeSlots.map((slot) => `${slot.start}-${slot.end}`).join(', ')}`;

const removeAvailabilityDayByLabel = (availability: ApiAvailabilityDay[], label: string) => {
  const next = availability.filter((day) => formatAvailabilityDay(day) !== label);
  return {
    availability: next,
    removed: next.length !== availability.length,
  };
};

export function Profile() {
  const { user: authUser, updateProfile } = useAuth();

  const makeLocal = () => authUser ? {
    name:         authUser.name ?? "",
    bio:          authUser.bio  ?? "",
    experience:   authUser.experience ?? 0,
    skills:       (authUser.skills ?? []) as Skill[],
    interests:    authUser.interests ?? [],
    availability: authUser.availability ?? { hoursPerWeek: 0, preferredTimes: [] },
    avatar:       (authUser as any).avatar ?? null,  // null means no avatar
  } : null;

  const [local, setLocal] = useState(makeLocal);

  // Re-sync when authUser changes (after save or onboarding)
  useEffect(() => { setLocal(makeLocal()); }, [authUser]);

  const [isEditing,       setIsEditing]       = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [isAddSkillOpen,  setIsAddSkillOpen]  = useState(false);
  const [showAIProcess,   setShowAIProcess]   = useState(false);
  const [skillText,       setSkillText]       = useState("");
  const [newSkill,        setNewSkill]        = useState<Partial<Skill>>({ name: "", category: "technical", level: "beginner" });
  const [availabilityTimeInput, setAvailabilityTimeInput] = useState("");
  const [availabilityParseInput, setAvailabilityParseInput] = useState("");
  const [parsedAvailability, setParsedAvailability] = useState<ApiAvailabilityDay[] | null>(null);
  const [availabilityDraft, setAvailabilityDraft] = useState<ApiAvailabilityDay[] | null>(null);
  const [lastSyncedAvailability, setLastSyncedAvailability] = useState<ApiAvailabilityDay[] | null>(null);
  const [availabilityDraftDirty, setAvailabilityDraftDirty] = useState(false);
  const [isParsingAvailability, setIsParsingAvailability] = useState(false);
  const [availabilityParseError, setAvailabilityParseError] = useState<string | null>(null);
  const [aiSkillError, setAiSkillError] = useState<string | null>(null);
  const [isAddInterestOpen, setIsAddInterestOpen] = useState(false);
  const [newInterest, setNewInterest] = useState("");

  const normalizeSkillName = (name: string) => name.trim().toLowerCase();

  const addLocalSkill = (skill: Skill) => {
    setLocal((p) => {
      if (!p) return p;
      const exists = p.skills.some((existing) => normalizeSkillName(existing.name) === normalizeSkillName(skill.name));
      return exists ? p : { ...p, skills: [...p.skills, skill] };
    });
  };

  const processSkillsWithAi = async (text: string, file?: File): Promise<Skill[]> => {
    const { skills } = await suggestSkillsFromInput(text, file);
    return skills;
  };

  const handleAddPreferredTime = () => {
    const value = availabilityTimeInput.trim();
    if (!value) return;
    setLocal((p) => {
      if (!p) return p;
      if (p.availability.preferredTimes.includes(value)) return p;
      return {
        ...p,
        availability: {
          ...p.availability,
          preferredTimes: [...p.availability.preferredTimes, value],
        },
      };
    });
    setAvailabilityTimeInput('');
  };

  const discardPendingAvailabilityChanges = () => {
    setParsedAvailability(null);
    setAvailabilityDraft(lastSyncedAvailability);
    setAvailabilityDraftDirty(false);
    setAvailabilityParseError(null);
  };

  const handleParseAvailabilityText = async () => {
    if (!availabilityParseInput.trim()) {
      setAvailabilityParseError('Ingresa una descripción de tu disponibilidad para analizarla.');
      return;
    }

    setAvailabilityParseError(null);
    setIsParsingAvailability(true);
    setParsedAvailability(null);

    try {
      const result = await parseAvailabilityFromInput(availabilityParseInput.trim());
      setParsedAvailability(result.availability);
      setAvailabilityDraft(result.availability);
      setAvailabilityDraftDirty(true);

      if (result.availability.length > 0) {
        const formatted = result.availability.map(formatAvailabilityDay);
        setLocal((p) => p ? {
          ...p,
          availability: {
            ...p.availability,
            preferredTimes: Array.from(new Set([...p.availability.preferredTimes, ...formatted])),
          }
        } : p);
        toast.success('Disponibilidad analizada', {
          description: result.source === 'heuristic'
            ? 'Se interpretó localmente. Guarda el perfil para conservar los cambios.'
            : 'Franjas horarias agregadas a tu perfil.',
        });
      }
    } catch (error) {
      setAvailabilityParseError(error instanceof Error ? error.message : 'No se pudo analizar la disponibilidad');
    } finally {
      setIsParsingAvailability(false);
    }
  };

  const handleRemovePreferredTime = (time: string) => {
    const sourceAvailability = availabilityDraft ?? lastSyncedAvailability;
    if (sourceAvailability) {
      const { availability, removed } = removeAvailabilityDayByLabel(sourceAvailability, time);
      if (removed) {
        setAvailabilityDraft(availability);
        setAvailabilityDraftDirty(true);
        setParsedAvailability((current) => current
          ? removeAvailabilityDayByLabel(current, time).availability
          : current
        );
      }
    }

    setLocal((p) => {
      if (!p) return p;
      return {
        ...p,
        availability: {
          ...p.availability,
          preferredTimes: p.availability.preferredTimes.filter((t) => t !== time),
        },
      };
    });
  };

  if (!authUser || !local) return null;

  const isProfileEmpty = !local.bio && local.skills.length === 0;

  // ── save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const availabilityPayload = availabilityDraft ?? [];
      if (hasBackendSession() && availabilityDraftDirty) {
        await profileApi.updateAvailability(availabilityPayload);
      }
      const skillsToSave = local.skills
        .map((s) => ({ ...s, name: s.name.trim() }))
        .filter((s) => s.name.length > 0);
      await updateProfile({
        name:           local.name,
        avatar:         local.avatar ?? null,
        bio:            local.bio,
        roleOrProgram:  "",
        yearsExperience: local.experience,
        skills:         skillsToSave,
        interests:      local.interests,
        hoursPerWeek:   local.availability.hoursPerWeek,
        preferredTimes: local.availability.preferredTimes,
        workTypes:      [],
      });
      if (availabilityDraftDirty) {
        setLastSyncedAvailability(availabilityPayload);
        setAvailabilityDraft(availabilityPayload);
        setAvailabilityDraftDirty(false);
      }
      setParsedAvailability(null);
      setAvailabilityParseError(null);
      setIsEditing(false);
      toast.success('Perfil guardado');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el perfil';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLocal(p => p ? { ...p, avatar: base64 } : p);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSkill = () => {
    if (!newSkill.name?.trim()) {
      toast.error("Ingresa el nombre de la habilidad");
      return;
    }
    if (newSkill.name && newSkill.category && newSkill.level) {
      const category = newSkill.category as Skill["category"];
      const skill: Skill = {
        id: `s${Date.now()}`,
        name: newSkill.name.trim(),
        category,
        level: newSkill.level as Skill["level"],
      };
      const exists = local.skills.some(
        (s) => s.name.trim().toLowerCase() === skill.name.toLowerCase()
      );
      if (exists) {
        toast.error("Esta habilidad ya está en tu perfil");
        return;
      }
      addLocalSkill(skill);
      setNewSkill({ name: "", category: "technical", level: "beginner" });
      setIsAddSkillOpen(false);
      toast.success(
        category === "domain"
          ? "Área de conocimiento agregada"
          : "Habilidad agregada",
        { description: "Recuerda guardar los cambios del perfil." }
      );
    }
  };

  const handleAddInterestSubmit = () => {
    const value = newInterest.trim();
    if (!value) {
      toast.error("Ingresa un área de interés");
      return;
    }
    if (local.interests.includes(value)) {
      toast.error("Este interés ya está registrado");
      return;
    }
    handleAddInterest(value);
    setNewInterest("");
    setIsAddInterestOpen(false);
    toast.success("Interés agregado", {
      description: "Recuerda guardar los cambios del perfil.",
    });
  };

  const handleRemoveSkill    = (id: string) => setLocal(p => p ? { ...p, skills: p.skills.filter(s => s.id !== id) } : p);
  const handleAddInterest    = (v: string)  => { if (v && !local.interests.includes(v)) setLocal(p => p ? { ...p, interests: [...p.interests, v] } : p); };
  const handleRemoveInterest = (v: string)  => setLocal(p => p ? { ...p, interests: p.interests.filter(i => i !== v) } : p);

  const handleAIProcess = () => {
    setAiSkillError(null);
    setShowAIProcess(true);
    void (async () => {
      try {
        const extracted = await processSkillsWithAi(skillText);
        extracted.forEach(addLocalSkill);
        setSkillText("");
        setIsAddSkillOpen(false);
        toast.success(`${extracted.length} habilidad${extracted.length === 1 ? '' : 'es'} detectada${extracted.length === 1 ? '' : 's'}`, {
          description: 'Recuerda guardar los cambios del perfil.',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo analizar el texto con IA.';
        setAiSkillError(message);
        toast.error(message);
      } finally {
        setShowAIProcess(false);
      }
    })();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo supera el límite de 5 MB.');
      return;
    }

    setAiSkillError(null);
    setShowAIProcess(true);
    void (async () => {
      try {
        const text = file.type === 'text/plain' ? await file.text() : '';
        const isPdf =
          file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const extracted = await processSkillsWithAi(text, isPdf ? file : undefined);
        extracted.forEach(addLocalSkill);
        setIsAddSkillOpen(false);
        toast.success(`${extracted.length} habilidad${extracted.length === 1 ? '' : 'es'} detectada${extracted.length === 1 ? '' : 's'}`, {
          description: 'Recuerda guardar los cambios del perfil.',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al procesar el archivo.';
        setAiSkillError(message);
        toast.error(message);
      } finally {
        setShowAIProcess(false);
        e.target.value = '';
      }
    })();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mi Perfil</h2>
          <p className="text-muted-foreground">Gestiona tu información y habilidades</p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setLocal(makeLocal()); discardPendingAvailabilityChanges(); setIsEditing(false); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving
                ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Guardando...</>
                : <><Save className="h-4 w-4" />Guardar Cambios</>}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit2 className="h-4 w-4 mr-2" />Editar Perfil
          </Button>
        )}
      </div>

      {/* ── Incomplete nudge ── */}
      {isProfileEmpty && !isEditing && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Tu perfil está incompleto</p>
            <p className="text-xs text-amber-700 dark:text-amber-300/90">Agrega una descripción y habilidades para que el motor de IA te encuentre proyectos.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50">
            Completar ahora
          </Button>
        </div>
      )}

      {/* ── Overview card ── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center overflow-hidden">
                {local.avatar
                  ? <img src={local.avatar as string} alt="Avatar" className="h-full w-full object-cover" />
                  : <span className="text-3xl font-bold text-white select-none">
                      {local.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                    </span>}
              </div>
              {isEditing && (
                <>
                  <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary p-1.5 rounded-full shadow cursor-pointer hover:bg-primary/90 transition-colors" title="Cambiar foto">
                    <Edit2 className="h-3.5 w-3.5 text-white" />
                  </label>
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  {local.avatar && (
                    <button
                      type="button"
                      title="Eliminar foto"
                      onClick={() => setLocal(p => p ? { ...p, avatar: null } : p)}
                      className="absolute top-0 right-0 bg-destructive p-1 rounded-full shadow hover:bg-destructive/80 transition-colors"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {isEditing
                    ? <Input value={local.name} onChange={e => setLocal(p => p ? { ...p, name: e.target.value } : p)} className="text-xl font-bold mb-2 h-10" placeholder="Tu nombre completo" />
                    : <h3 className="text-2xl font-bold mb-1 truncate">{local.name}</h3>}
                  <p className="text-muted-foreground text-sm">{authUser.email}</p>
                </div>
                {(authUser.rating ?? 0) > 0 && (
                  <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-lg ml-4 shrink-0">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">{authUser.rating}/5</span>
                  </div>
                )}
              </div>

              {isEditing
                ? <Textarea value={local.bio} onChange={e => setLocal(p => p ? { ...p, bio: e.target.value } : p)} rows={3} className="mb-4" placeholder="Cuéntanos sobre ti: qué te apasiona, tu trayectoria, qué tipo de proyectos buscas..." />
                : <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {local.bio || <span className="italic opacity-60">Sin descripción — edita tu perfil para agregar una.</span>}
                  </p>}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  {isEditing
                    ? <Input type="number" value={local.experience} onChange={e => setLocal(p => p ? { ...p, experience: Number(e.target.value) } : p)} className="h-7 w-20 text-sm" min={0} />
                    : <span>{local.experience > 0 ? `${local.experience} años de experiencia` : "Sin experiencia registrada"}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4" />
                  <span>{authUser.completedProjects ?? 0} proyectos completados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{local.availability.hoursPerWeek > 0 ? `${local.availability.hoursPerWeek}h/semana` : "Disponibilidad no definida"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3"><Target className="h-5 w-5 text-primary" /></div>
          <p className="text-sm text-muted-foreground mb-1">Habilidades Registradas</p>
          <p className="text-3xl font-bold">{local.skills.length}</p>
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendingUp className="h-3 w-3 text-green-600" />
            <span className="text-green-600">{local.skills.filter(s => s.level === "advanced" || s.level === "expert").length} avanzadas</span>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3"><Star className="h-5 w-5 text-green-600" /></div>
          <p className="text-sm text-muted-foreground mb-1">Rating Promedio</p>
          {(authUser.rating ?? 0) > 0 ? (
            <><p className="text-3xl font-bold">{authUser.rating}/5</p>
            <div className="flex mt-2">{[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= (authUser.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />)}</div></>
          ) : (
            <><p className="text-3xl font-bold text-muted-foreground">—</p><p className="text-xs text-muted-foreground mt-2">Sin evaluaciones aún</p></>
          )}
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3"><Award className="h-5 w-5 text-purple-600" /></div>
          <p className="text-sm text-muted-foreground mb-1">Proyectos Completados</p>
          <p className="text-3xl font-bold">{authUser.completedProjects ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-2">{(authUser.completedProjects ?? 0) > 0 ? "¡Sigue así!" : "Únete a tu primer proyecto"}</p>
        </CardContent></Card>
      </div>

      {/* ── Skills ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Habilidades</CardTitle><CardDescription>Tus competencias técnicas y blandas</CardDescription></div>
            {isEditing && (
              <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Agregar Habilidad</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar habilidad o área de conocimiento</DialogTitle>
                    <DialogDescription>
                      Agrega competencias técnicas, blandas, idiomas o áreas de dominio. Puedes usar texto libre, CV o entrada manual.
                    </DialogDescription>
                  </DialogHeader>
                  {showAIProcess ? (
                    <div className="py-8 text-center">
                      <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
                      <p className="text-lg font-medium mb-2">Procesando con IA...</p>
                      <p className="text-sm text-muted-foreground">Extrayendo y normalizando habilidades</p>
                    </div>
                  ) : (
                    <div className="space-y-4 py-4">
                      <Tabs defaultValue="text">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="text">Texto Libre</TabsTrigger>
                          <TabsTrigger value="file">Cargar CV</TabsTrigger>
                          <TabsTrigger value="manual">Manual</TabsTrigger>
                        </TabsList>
                        <TabsContent value="text" className="space-y-4">
                          <Textarea placeholder="Ej: Tengo 5 años de experiencia en React..." value={skillText} onChange={e => { setSkillText(e.target.value); setAiSkillError(null); }} rows={5} />
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" />La IA interpretará el texto y propondrá habilidades técnicas y blandas</p>
                          {aiSkillError && (
                            <p className="text-sm text-destructive flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              {aiSkillError}
                            </p>
                          )}
                          <Button className="w-full" onClick={handleAIProcess} disabled={!skillText}><Sparkles className="h-4 w-4 mr-2" />Procesar con IA</Button>
                        </TabsContent>
                        <TabsContent value="file" className="space-y-4">
                          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                            <Input type="file" accept=".pdf,.txt" onChange={handleFileUpload} className="hidden" id="cv-upload" />
                            <label htmlFor="cv-upload" className="cursor-pointer">
                              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                              <p className="text-sm font-medium mb-1">Haz clic para cargar</p>
                              <p className="text-xs text-muted-foreground">PDF o TXT (máx. 5MB)</p>
                            </label>
                          </div>
                        </TabsContent>
                        <TabsContent value="manual" className="space-y-4">
                          <div className="space-y-2"><Label>Nombre de la Habilidad</Label>
                            <Input placeholder="Ej: Ciberseguridad, Contabilidad, React, Liderazgo" value={newSkill.name} onChange={e => setNewSkill({ ...newSkill, name: e.target.value })} list="skill-catalog-list" />
                            <datalist id="skill-catalog-list">
                              {SKILL_SUGGESTIONS.map((s) => (
                                <option key={s} value={s} />
                              ))}
                            </datalist>
                          </div>
                          <div className="space-y-2"><Label>Categoría</Label>
                            <Select value={newSkill.category} onValueChange={(v: Skill["category"]) => setNewSkill({ ...newSkill, category: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technical">Técnica</SelectItem>
                                <SelectItem value="soft">Blanda</SelectItem>
                                <SelectItem value="language">Idioma</SelectItem>
                                <SelectItem value="domain">Área de conocimiento</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2"><Label>Nivel</Label>
                            <Select value={newSkill.level} onValueChange={(v: Skill["level"]) => setNewSkill({ ...newSkill, level: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="beginner">Principiante</SelectItem>
                                <SelectItem value="intermediate">Intermedio</SelectItem>
                                <SelectItem value="advanced">Avanzado</SelectItem>
                                <SelectItem value="expert">Experto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button className="w-full" onClick={handleAddSkill}>Agregar Habilidad</Button>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => setIsAddSkillOpen(false)}>Cancelar</Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {local.skills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tienes habilidades registradas.</p>
              {!isEditing && <Button size="sm" variant="outline" className="mt-3" onClick={() => setIsEditing(true)}>Agregar habilidades</Button>}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                local.skills.reduce((acc, s) => { if (!acc[s.category]) acc[s.category] = []; acc[s.category].push(s); return acc; }, {} as Record<string, Skill[]>)
              ).map(([cat, skills]) => (
                <div key={cat}>
                  <h4 className="text-sm font-medium mb-3">{skillCategories[cat as keyof typeof skillCategories]?.label ?? cat}</h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(skill => (
                      <div key={skill.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${skillCategories[skill.category]?.color ?? "border-border bg-muted"}`}>
                        <div>
                          <p className="font-medium text-sm">{skill.name}</p>
                          <div className="flex gap-0.5 mt-1">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className={`h-1 w-4 rounded ${i < (skillLevels[skill.level]?.bars ?? 0) ? "bg-current" : "bg-current opacity-20"}`} />
                            ))}
                          </div>
                        </div>
                        {isEditing && <button type="button" onClick={() => handleRemoveSkill(skill.id)} className="ml-2 hover:bg-black/10 rounded p-1"><X className="h-3 w-3" /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Interests ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Intereses</CardTitle>
              <CardDescription>Áreas y temas que te apasionan</CardDescription>
            </div>
            {isEditing && (
              <Dialog open={isAddInterestOpen} onOpenChange={setIsAddInterestOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-3 w-3 mr-1" />Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar interés</DialogTitle>
                    <DialogDescription>
                      Temas o sectores que te interesan para encontrar proyectos afines.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Área de interés</Label>
                      <Input
                        placeholder="Ej: Inteligencia artificial, emprendimiento, salud digital"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddInterestSubmit();
                          }
                        }}
                      />
                    </div>
                    <Button className="w-full" onClick={handleAddInterestSubmit}>
                      Agregar interés
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {local.interests.length === 0 && !isEditing
            ? <p className="text-sm text-muted-foreground italic">Sin intereses registrados.</p>
            : <div className="flex flex-wrap gap-2">
                {local.interests.map(i => (
                  <Badge key={i} variant="secondary" className="px-3 py-1.5">{i}
                    {isEditing && <button type="button" onClick={() => handleRemoveInterest(i)} className="ml-2 hover:bg-foreground/10 rounded"><X className="h-3 w-3" /></button>}
                  </Badge>
                ))}
              </div>}
        </CardContent>
      </Card>

      {/* ── Availability ── */}
      <Card>
        <CardHeader><CardTitle>Disponibilidad</CardTitle><CardDescription>Tu tiempo disponible para proyectos</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="availability-hours">Horas disponibles por semana</Label>
              {isEditing
                ? <>
                    <Input id="availability-hours" type="number" value={local.availability.hoursPerWeek} onChange={e => setLocal(p => p ? { ...p, availability: { ...p.availability, hoursPerWeek: Number(e.target.value) || 0 } } : p)} min={0} max={40} />
                    <p className="text-xs text-muted-foreground">Cantidad total de horas que puedes dedicar a proyectos cada semana.</p>
                  </>
                : <p className="text-2xl font-bold">{local.availability.hoursPerWeek > 0 ? `${local.availability.hoursPerWeek}h` : "—"}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred-time">Franjas horarias preferidas</Label>
              {isEditing ? (
                <>
                  <div className="flex gap-2">
                    <Input
                      id="preferred-time"
                      placeholder="Ej: Lunes 6-8 pm, tardes, fines de semana"
                      value={availabilityTimeInput}
                      onChange={(e) => setAvailabilityTimeInput(e.target.value)}
                    />
                    <Button size="sm" onClick={handleAddPreferredTime}>Agregar</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {local.availability.preferredTimes.length > 0 ? (
                      local.availability.preferredTimes.map((t) => (
                        <Badge key={t} variant="secondary" className="flex items-center gap-2">
                          {t}
                          <button type="button" onClick={() => handleRemovePreferredTime(t)} className="inline-flex rounded-full p-1 hover:bg-black/10">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Agrega tus franjas horarias preferidas.</p>
                    )}
                  </div>
                  <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold">Analiza tu disponibilidad</p>
                        <p className="text-xs text-muted-foreground">Escribe tu disponibilidad en lenguaje natural y genera franjas horarias automáticamente.</p>
                      </div>
                      <Button size="sm" onClick={handleParseAvailabilityText} disabled={isParsingAvailability}>
                        {isParsingAvailability ? 'Analizando...' : 'Analizar texto'}
                      </Button>
                    </div>
                    <Textarea
                      value={availabilityParseInput}
                      onChange={(e) => setAvailabilityParseInput(e.target.value)}
                      placeholder="Ej: Lunes de 9 a 11 y miércoles de 18 a 20"
                      rows={3}
                    />
                    {availabilityParseError && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {availabilityParseError}
                      </div>
                    )}
                    {parsedAvailability && parsedAvailability.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-foreground">Resultados detectados:</p>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {parsedAvailability.map((entry) => (
                            <div key={entry.day} className="rounded-lg bg-card border border-border p-2">
                              <p className="font-medium">{entry.day}</p>
                              <p>{entry.timeSlots.map((slot) => `${slot.start}-${slot.end}`).join(', ')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Estos horarios ayudan a encontrar proyectos que se adapten a tu carga semanal.</p>
                </>
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {local.availability.preferredTimes.length > 0
                    ? local.availability.preferredTimes.map((t) => (
                        <Badge key={t} variant="secondary">{t}</Badge>
                      ))
                    : <p className="text-sm text-muted-foreground italic">No definidos</p>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
