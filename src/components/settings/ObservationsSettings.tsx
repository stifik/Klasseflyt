"use client";

import * as React from "react";
import { useState } from "react";
import type { AppSettings, BehaviorType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

interface ObservationsSettingsProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

const availableIcons = [
  'Smile', 'Annoyed', 'Handshake', 'Star', 'ThumbsUp', 'ThumbsDown', 'Award', 'BookOpen',
  'MessageSquareWarning', 'Hand', 'Heart', 'Sparkles', 'Zap', 'Wind', 'CheckCircle2'
];

const availableColors: BehaviorType['color'][] = ['green', 'yellow', 'blue', 'red', 'purple', 'gray'];
const colorClasses: Record<BehaviorType['color'], string> = {
  green: 'bg-green-500', yellow: 'bg-yellow-500', blue: 'bg-blue-500',
  red: 'bg-red-500', purple: 'bg-purple-500', gray: 'bg-gray-500',
};

const Icon = ({ name, className }: { name: string, className?: string }) => {
  const LucideIcon = (LucideIcons as any)[name];
  if (!LucideIcon) return <LucideIcons.Star className={className} />;
  return <LucideIcon className={className} />;
}

export default function ObservationsSettings({ settings, onSettingsChange }: ObservationsSettingsProps) {
  const [newRemarkType, setNewRemarkType] = useState("");
  const [newBehaviorLabel, setNewBehaviorLabel] = useState("");
  const [newBehaviorIcon, setNewBehaviorIcon] = useState<string>(availableIcons[0]);
  const [newBehaviorColor, setNewBehaviorColor] = useState<BehaviorType['color']>(availableColors[0]);

  const handleAddRemarkType = () => {
    if (newRemarkType.trim() && !settings.remarkTypes?.includes(newRemarkType.trim())) {
      const updatedTypes = [...(settings.remarkTypes || []), newRemarkType.trim()];
      onSettingsChange({ ...settings, remarkTypes: updatedTypes });
      setNewRemarkType("");
    }
  };

  const handleDeleteRemarkType = (typeToDelete: string) => {
    const updatedTypes = settings.remarkTypes?.filter(t => t !== typeToDelete);
    onSettingsChange({ ...settings, remarkTypes: updatedTypes });
  };

  const handleAddBehaviorType = () => {
    if (newBehaviorLabel.trim()) {
      const newType: BehaviorType = {
        id: uuidv4(),
        label: newBehaviorLabel.trim(),
        icon: newBehaviorIcon,
        color: newBehaviorColor
      };
      const updatedTypes = [...(settings.behaviorTypes || []), newType];
      onSettingsChange({ ...settings, behaviorTypes: updatedTypes });
      setNewBehaviorLabel("");
    }
  };

  const handleDeleteBehaviorType = (idToDelete: string) => {
    const updatedTypes = settings.behaviorTypes?.filter(t => t.id !== idToDelete);
    onSettingsChange({ ...settings, behaviorTypes: updatedTypes });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Observasjoner og Atferd</CardTitle>
        <CardDescription>Administrer anmerkningstyper og atferdstyper</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['remarkTypes']} className="w-full">
          <AccordionItem value="remarkTypes">
            <AccordionTrigger>Anmerkningstyper ({(settings.remarkTypes || []).length})</AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="flex gap-2 mb-4">
                <Input
                  value={newRemarkType}
                  onChange={(e) => setNewRemarkType(e.target.value)}
                  placeholder="Ny anmerkningstype..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRemarkType()}
                />
                <Button onClick={handleAddRemarkType}>
                  <Plus className="mr-2" /> Legg til
                </Button>
              </div>
              <ul className="space-y-2">
                {(settings.remarkTypes || []).map((type) => (
                  <li key={type} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                    <span>{type}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRemarkType(type)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="behaviorTypes" className="border-b-0">
            <AccordionTrigger>Atferdstyper ({(settings.behaviorTypes || []).length})</AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="p-2 space-y-3 border-b mb-4">
                <Input
                  value={newBehaviorLabel}
                  onChange={(e) => setNewBehaviorLabel(e.target.value)}
                  placeholder="Ny atferdstype..."
                />
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start">
                        <Icon name={newBehaviorIcon} className="w-4 h-4 mr-2" />
                        Velg ikon
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="grid grid-cols-5 gap-1">
                        {availableIcons.map(icon => (
                          <Button
                            key={icon}
                            variant={newBehaviorIcon === icon ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setNewBehaviorIcon(icon)}
                          >
                            <Icon name={icon} />
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start">
                        <div className={cn("w-4 h-4 rounded-full mr-2", colorClasses[newBehaviorColor])} />
                        Velg farge
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="flex gap-1">
                        {availableColors.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewBehaviorColor(color)}
                            className={cn("w-6 h-6 rounded-full", colorClasses[color], {
                              'ring-2 ring-ring ring-offset-2': newBehaviorColor === color
                            })}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={handleAddBehaviorType} className="w-full">
                  <Plus className="mr-2" /> Legg til
                </Button>
              </div>
              <ul className="space-y-2">
                {(settings.behaviorTypes || []).map((type) => (
                  <li key={type.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                    <div className="flex items-center gap-2">
                      <Icon name={type.icon} className="w-4 h-4" />
                      <div className={cn("w-3 h-3 rounded-full", colorClasses[type.color])} />
                      <span>{type.label}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBehaviorType(type.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
