import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  User,
  Briefcase,
  Star,
  Clock,
  Plus,
  X,
  Edit2,
  Save,
  Award,
  TrendingUp,
  Target,
  Upload,
  FileText,
  Sparkles,
} from "lucide-react";
import { currentUser, type Skill } from "../lib/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function Profile() {
  const [isEditing, setIsEditing] = useState(false);

  const [user, setUser] = useState<typeof currentUser>(() => {
    // Cargar info real del usuario si existe
    const savedUser = localStorage.getItem("loggedUser");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      return {
        ...parsed,
        skills: parsed.skills ?? [],
        interests: parsed.interests ?? [],
        availability: parsed.availability ?? {
          hoursPerWeek: 20,
          preferredTimes: [],
        },
      };
    }

    // Si no hay, usa plantilla del prototipo
    return {
      id: "template-user",
      name: "María García",
      email: "maria.garcia@example.com",
      avatar: undefined,
      bio: "Desarrolladora Full Stack apasionada por crear soluciones innovadoras",
      experience: 3,
      completedProjects: 8,
      availability: { hoursPerWeek: 20, preferredTimes: [] },
      rating: 4.7,
      skills: [],
      interests: [],
    };
  });

  useEffect(() => {
    const savedAvatar = localStorage.getItem(`avatar_${user.id}`);
    if (savedAvatar) setUser((prev) => ({ ...prev, avatar: savedAvatar }));
  }, [user.id]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUser((prev) => ({ ...prev, avatar: url }));
      localStorage.setItem(`avatar_${user.id}`, url); // persistencia por usuario
    }
  };

  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [showAIProcessing, setShowAIProcessing] = useState(false);
  const [skillText, setSkillText] = useState("");
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    name: "",
    category: "technical",
    level: "beginner",
  });

  const skillCategories = {
    technical: { label: "Técnicas", color: "bg-blue-100 text-blue-700" },
    soft: { label: "Blandas", color: "bg-green-100 text-green-700" },
    language: { label: "Idiomas", color: "bg-purple-100 text-purple-700" },
    domain: { label: "Dominio", color: "bg-amber-100 text-amber-700" },
  };

  const skillLevels = {
    beginner: { label: "Principiante", bars: 1 },
    intermediate: { label: "Intermedio", bars: 2 },
    advanced: { label: "Avanzado", bars: 3 },
    expert: { label: "Experto", bars: 4 },
  };

  const handleAddSkill = () => {
    if (newSkill.name && newSkill.category && newSkill.level) {
      const skill: Skill = {
        id: `s${Date.now()}`,
        name: newSkill.name,
        category: newSkill.category as Skill["category"],
        level: newSkill.level as Skill["level"],
      };
      setUser({ ...user, skills: [...user.skills, skill] });
      setNewSkill({ name: "", category: "technical", level: "beginner" });
      setIsAddSkillOpen(false);
    }
  };

  const handleRemoveSkill = (skillId: string) => {
    setUser({ ...user, skills: user.skills.filter((s) => s.id !== skillId) });
  };

  const handleAddInterest = (interest: string) => {
    if (interest && !user.interests.includes(interest)) {
      setUser({ ...user, interests: [...user.interests, interest] });
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setUser({
      ...user,
      interests: user.interests.filter((i) => i !== interest),
    });
  };

  const handleAIProcessSkills = () => {
    setShowAIProcessing(true);
    // Simulamos el procesamiento con LLM/SLM
    setTimeout(() => {
      // Aquí se simula la extracción de habilidades del texto
      const extractedSkills: Skill[] = [
        {
          id: `s${Date.now()}`,
          name: "React",
          category: "technical",
          level: "advanced",
        },
        {
          id: `s${Date.now() + 1}`,
          name: "TypeScript",
          category: "technical",
          level: "intermediate",
        },
      ];
      setUser({ ...user, skills: [...user.skills, ...extractedSkills] });
      setSkillText("");
      setShowAIProcessing(false);
      setIsAddSkillOpen(false);
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setShowAIProcessing(true);
      // Simulamos el procesamiento del archivo
      setTimeout(() => {
        const extractedSkills: Skill[] = [
          {
            id: `s${Date.now()}`,
            name: "Java",
            category: "technical",
            level: "expert",
          },
          {
            id: `s${Date.now() + 1}`,
            name: "Cloud Computing",
            category: "technical",
            level: "advanced",
          },
        ];
        setUser({ ...user, skills: [...user.skills, ...extractedSkills] });
        setShowAIProcessing(false);
        setIsAddSkillOpen(false);
      }, 2500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mi Perfil</h2>
          <p className="text-muted-foreground">
            Gestiona tu información y habilidades
          </p>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "default" : "outline"}
        >
          {isEditing ? (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          ) : (
            <>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar Perfil
            </>
          )}
        </Button>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="h-24 w-24 relative flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-green-500 flex items-center justify-center overflow-hidden relative">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <User className="h-12 w-12 text-white" />
                )}
              </div>

              {isEditing && (
                <>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 -translate-x-2 translate-y-2 bg-gray-700 p-1 rounded-full shadow cursor-pointer hover:bg-gray-600"
                    title="Cambiar foto de perfil"
                  >
                    <Edit2 className="h-4 w-4 text-white" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    title="Cambiar foto de perfil"
                    aria-label="Cambiar foto de perfil"
                    onChange={handleAvatarChange}
                  />
                </>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  {isEditing ? (
                    <Input
                      value={user.name}
                      onChange={(e) =>
                        setUser({ ...user, name: e.target.value })
                      }
                      className="text-2xl font-bold mb-2"
                      title="Nombre"
                      aria-label="Nombre"
                      placeholder="Tu nombre"
                    />
                  ) : (
                    <h3 className="text-2xl font-bold mb-2">{user.name}</h3>
                  )}
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">{user.rating}/5</span>
                  </div>
                </div>
              </div>
              {isEditing ? (
                <Textarea
                  value={user.bio}
                  onChange={(e) => setUser({ ...user, bio: e.target.value })}
                  rows={3}
                  className="mb-4"
                  title="Biografía"
                  aria-label="Biografía"
                />
              ) : (
                <p className="text-muted-foreground mb-4">{user.bio}</p>
              )}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {user.experience} años de experiencia
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {user.completedProjects} proyectos completados
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {user.availability.hoursPerWeek}h/semana
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Habilidades Registradas
            </p>
            <p className="text-3xl font-bold">{user.skills.length}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                {
                  user.skills.filter(
                    (s) => s.level === "advanced" || s.level === "expert",
                  ).length
                }{" "}
                avanzadas
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Rating Promedio
            </p>
            <p className="text-3xl font-bold">{user.rating}/5</p>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= user.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Tasa de Éxito</p>
            <p className="text-3xl font-bold">92%</p>
            <p className="text-xs text-muted-foreground mt-2">
              En completar proyectos a tiempo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Habilidades</CardTitle>
              <CardDescription>
                Tus competencias técnicas y blandas
              </CardDescription>
            </div>
            {isEditing && (
              <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Habilidad
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Nueva Habilidad</DialogTitle>
                    <DialogDescription>
                      Ingresa tus habilidades en lenguaje natural o carga tu CV
                    </DialogDescription>
                  </DialogHeader>

                  {showAIProcessing ? (
                    <div className="py-8 text-center">
                      <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
                      <p className="text-lg font-medium mb-2">
                        Procesando con IA...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Extrayendo y normalizando habilidades
                      </p>
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
                          <div className="space-y-2">
                            <Label>
                              Describe tus habilidades en lenguaje natural
                            </Label>
                            <Textarea
                              placeholder="Ej: Tengo 5 años de experiencia en React, soy experto en Node.js y tengo conocimientos intermedios de Python..."
                              value={skillText}
                              onChange={(e) => setSkillText(e.target.value)}
                              rows={5}
                            />
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              La IA extraerá y normalizará automáticamente tus
                              habilidades
                            </p>
                          </div>
                          <Button
                            className="w-full"
                            onClick={handleAIProcessSkills}
                            disabled={!skillText}
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Procesar con IA
                          </Button>
                        </TabsContent>

                        <TabsContent value="file" className="space-y-4">
                          <div className="space-y-2">
                            <Label>Sube tu CV (PDF o TXT)</Label>
                            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                              <Input
                                type="file"
                                accept=".pdf,.txt"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="cv-upload"
                                title="Subir CV"
                                aria-label="Subir CV"
                              />
                              <label
                                htmlFor="cv-upload"
                                className="cursor-pointer"
                              >
                                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm font-medium mb-1">
                                  Haz clic para cargar
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  PDF o TXT (máx. 5MB)
                                </p>
                              </label>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              El modelo LLM/SLM procesará tu CV automáticamente
                            </p>
                          </div>
                        </TabsContent>

                        <TabsContent value="manual" className="space-y-4">
                          <div className="space-y-2">
                            <Label>Nombre de la Habilidad</Label>
                            <Input
                              placeholder="Ej: React, Liderazgo, Python"
                              value={newSkill.name}
                              onChange={(e) =>
                                setNewSkill({
                                  ...newSkill,
                                  name: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Select
                              value={newSkill.category}
                              onValueChange={(value: Skill["category"]) =>
                                setNewSkill({ ...newSkill, category: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technical">
                                  Técnica
                                </SelectItem>
                                <SelectItem value="soft">Blanda</SelectItem>
                                <SelectItem value="language">Idioma</SelectItem>
                                <SelectItem value="domain">Dominio</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Nivel</Label>
                            <Select
                              value={newSkill.level}
                              onValueChange={(value: Skill["level"]) =>
                                setNewSkill({ ...newSkill, level: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="beginner">
                                  Principiante
                                </SelectItem>
                                <SelectItem value="intermediate">
                                  Intermedio
                                </SelectItem>
                                <SelectItem value="advanced">
                                  Avanzado
                                </SelectItem>
                                <SelectItem value="expert">Experto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button className="w-full" onClick={handleAddSkill}>
                            Agregar Habilidad
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsAddSkillOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(
              user.skills.reduce(
                (acc, skill) => {
                  if (!acc[skill.category]) acc[skill.category] = [];
                  acc[skill.category].push(skill);
                  return acc;
                },
                {} as Record<string, Skill[]>,
              ),
            ).map(([category, skills]) => (
              <div key={category}>
                <h4 className="text-sm font-medium mb-3">
                  {
                    skillCategories[category as keyof typeof skillCategories]
                      .label
                  }
                </h4>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        skillCategories[skill.category].color
                      }`}
                    >
                      <div>
                        <p className="font-medium">{skill.name}</p>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-1 w-4 rounded ${
                                i < skillLevels[skill.level].bars
                                  ? "bg-current"
                                  : "bg-current opacity-20"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          aria-label={`Eliminar habilidad ${skill.name}`}
                          onClick={() => handleRemoveSkill(skill.id)}
                          className="ml-2 hover:bg-black/10 rounded p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle>Intereses</CardTitle>
          <CardDescription>Áreas y temas que te apasionan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <Badge key={interest} variant="outline" className="px-3 py-1.5">
                {interest}
                {isEditing && (
                  <button
                    type="button"
                    aria-label={`Eliminar interés ${interest}`}
                    onClick={() => handleRemoveInterest(interest)}
                    className="ml-2 hover:bg-black/10 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {isEditing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const interest = prompt("Agregar nuevo interés:");
                  if (interest) handleAddInterest(interest);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Disponibilidad</CardTitle>
          <CardDescription>Tu tiempo disponible para proyectos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hoursPerWeek">Horas por semana</Label>
              {isEditing ? (
                <Input
                  id="hoursPerWeek"
                  type="number"
                  value={user.availability.hoursPerWeek}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      availability: {
                        ...user.availability,
                        hoursPerWeek: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              ) : (
                <p className="text-2xl font-bold">
                  {user.availability.hoursPerWeek}h
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Horarios preferidos</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {user.availability.preferredTimes.map((time) => (
                  <Badge key={time} variant="secondary">
                    {time}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
