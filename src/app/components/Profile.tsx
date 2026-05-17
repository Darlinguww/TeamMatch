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

const skillCategories = {
  technical: { label: "Técnicas",  color: "bg-blue-100 text-blue-700"    },
  soft:      { label: "Blandas",   color: "bg-green-100 text-green-700"  },
  language:  { label: "Idiomas",   color: "bg-purple-100 text-purple-700"},
  domain:    { label: "Dominio",   color: "bg-amber-100 text-amber-700"  },
};

const skillLevels = {
  beginner:     { bars: 1 },
  intermediate: { bars: 2 },
  advanced:     { bars: 3 },
  expert:       { bars: 4 },
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
    avatar:       (authUser as any).avatar as string | undefined,
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

  if (!authUser || !local) return null;

  const isProfileEmpty = !local.bio && local.skills.length === 0;

  // ── save ──
  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      name:           local.name,
      avatar:         local.avatar,
      bio:            local.bio,
      roleOrProgram:  "",
      yearsExperience: local.experience,
      skills:         local.skills.map(s => ({ id: s.id, name: s.name, level: s.level, category: s.category })),
      interests:      local.interests,
      hoursPerWeek:   local.availability.hoursPerWeek,
      preferredTimes: local.availability.preferredTimes,
      workTypes:      [],
    });
    setSaving(false);
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocal(p => p ? { ...p, avatar: url } : p);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.name && newSkill.category && newSkill.level) {
      const skill: Skill = { id: `s${Date.now()}`, name: newSkill.name, category: newSkill.category as Skill["category"], level: newSkill.level as Skill["level"] };
      setLocal(p => p ? { ...p, skills: [...p.skills, skill] } : p);
      setNewSkill({ name: "", category: "technical", level: "beginner" });
      setIsAddSkillOpen(false);
    }
  };

  const handleRemoveSkill    = (id: string) => setLocal(p => p ? { ...p, skills: p.skills.filter(s => s.id !== id) } : p);
  const handleAddInterest    = (v: string)  => { if (v && !local.interests.includes(v)) setLocal(p => p ? { ...p, interests: [...p.interests, v] } : p); };
  const handleRemoveInterest = (v: string)  => setLocal(p => p ? { ...p, interests: p.interests.filter(i => i !== v) } : p);

  const handleAIProcess = () => {
    setShowAIProcess(true);
    setTimeout(() => {
      const extracted: Skill[] = [
        { id: `s${Date.now()}`,     name: "React",      category: "technical", level: "advanced"     },
        { id: `s${Date.now() + 1}`, name: "TypeScript", category: "technical", level: "intermediate" },
      ];
      setLocal(p => p ? { ...p, skills: [...p.skills, ...extracted] } : p);
      setSkillText(""); setShowAIProcess(false); setIsAddSkillOpen(false);
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setShowAIProcess(true);
      setTimeout(() => {
        const extracted: Skill[] = [
          { id: `s${Date.now()}`,     name: "Java",            category: "technical", level: "expert"   },
          { id: `s${Date.now() + 1}`, name: "Cloud Computing", category: "technical", level: "advanced" },
        ];
        setLocal(p => p ? { ...p, skills: [...p.skills, ...extracted] } : p);
        setShowAIProcess(false); setIsAddSkillOpen(false);
      }, 2500);
    }
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
            <Button variant="outline" onClick={() => { setLocal(makeLocal()); setIsEditing(false); }}>Cancelar</Button>
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Tu perfil está incompleto</p>
            <p className="text-xs text-amber-700">Agrega una descripción y habilidades para que el motor de IA te encuentre proyectos.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100">
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
                  ? <img src={local.avatar} alt="Avatar" className="h-full w-full object-cover" />
                  : <span className="text-3xl font-bold text-white select-none">
                      {local.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                    </span>}
              </div>
              {isEditing && (
                <>
                  <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-gray-700 p-1.5 rounded-full shadow cursor-pointer hover:bg-gray-600 transition-colors" title="Cambiar foto">
                    <Edit2 className="h-3.5 w-3.5 text-white" />
                  </label>
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  {local.avatar && (
                    <button
                      type="button"
                      title="Eliminar foto"
                      onClick={() => setLocal(p => p ? { ...p, avatar: undefined } : p)}
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
                  <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg ml-4 shrink-0">
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
            <div className="flex mt-2">{[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= (authUser.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}</div></>
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
                    <DialogTitle>Agregar Nueva Habilidad</DialogTitle>
                    <DialogDescription>Ingresa tus habilidades en lenguaje natural o carga tu CV</DialogDescription>
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
                          <Textarea placeholder="Ej: Tengo 5 años de experiencia en React..." value={skillText} onChange={e => setSkillText(e.target.value)} rows={5} />
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" />La IA extraerá y normalizará tus habilidades</p>
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
                            <Input placeholder="Ej: React, Liderazgo, Python" value={newSkill.name} onChange={e => setNewSkill({ ...newSkill, name: e.target.value })} />
                          </div>
                          <div className="space-y-2"><Label>Categoría</Label>
                            <Select value={newSkill.category} onValueChange={(v: Skill["category"]) => setNewSkill({ ...newSkill, category: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technical">Técnica</SelectItem>
                                <SelectItem value="soft">Blanda</SelectItem>
                                <SelectItem value="language">Idioma</SelectItem>
                                <SelectItem value="domain">Dominio</SelectItem>
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
                      <div key={skill.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${skillCategories[skill.category]?.color ?? ""}`}>
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
        <CardHeader><CardTitle>Intereses</CardTitle><CardDescription>Áreas y temas que te apasionan</CardDescription></CardHeader>
        <CardContent>
          {local.interests.length === 0 && !isEditing
            ? <p className="text-sm text-muted-foreground italic">Sin intereses registrados.</p>
            : <div className="flex flex-wrap gap-2">
                {local.interests.map(i => (
                  <Badge key={i} variant="outline" className="px-3 py-1.5">{i}
                    {isEditing && <button type="button" onClick={() => handleRemoveInterest(i)} className="ml-2 hover:bg-black/10 rounded"><X className="h-3 w-3" /></button>}
                  </Badge>
                ))}
                {isEditing && (
                  <Button size="sm" variant="outline" onClick={() => { const v = prompt("Nuevo interés:"); if (v) handleAddInterest(v.trim()); }}>
                    <Plus className="h-3 w-3 mr-1" />Agregar
                  </Button>
                )}
              </div>}
        </CardContent>
      </Card>

      {/* ── Availability ── */}
      <Card>
        <CardHeader><CardTitle>Disponibilidad</CardTitle><CardDescription>Tu tiempo disponible para proyectos</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Horas por semana</Label>
              {isEditing
                ? <Input type="number" value={local.availability.hoursPerWeek} onChange={e => setLocal(p => p ? { ...p, availability: { ...p.availability, hoursPerWeek: Number(e.target.value) || 0 } } : p)} min={0} max={40} />
                : <p className="text-2xl font-bold">{local.availability.hoursPerWeek > 0 ? `${local.availability.hoursPerWeek}h` : "—"}</p>}
            </div>
            <div className="space-y-2">
              <Label>Horarios preferidos</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {local.availability.preferredTimes.length > 0
                  ? local.availability.preferredTimes.map(t => <Badge key={t} variant="secondary">{t}</Badge>)
                  : <p className="text-sm text-muted-foreground italic">No definidos</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}