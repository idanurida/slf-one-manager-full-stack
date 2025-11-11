// FILE: src/components/project-lead/projects/TeamMemberCard.js
"use client";

import React from 'react';

// shadcn/ui Components
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lucide Icons
import { Trash2, User, Mail } from 'lucide-react';

// Other Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// --- Utility Functions ---
const getRoleColor = (role) => {
  const colors = {
    inspector: 'green',
    drafter: 'yellow',
    project_lead: 'blue',
    head_consultant: 'purple',
    admin_lead: 'cyan',
    superadmin: 'red',
    client: 'pink',
  };
  return colors[role] || 'gray';
};

const getSpecializationColor = (specialization) => {
  const colors = {
    dokumen: 'gray',
    struktur: 'blue',
    kebakaran: 'red',
    elektrikal: 'orange',
    tata_udara: 'cyan',
    akustik: 'purple',
    arsitektur: 'pink',
    lingkungan: 'green',
    mekanikal: 'yellow',
    material: 'teal',
    gas_medik: 'pink',
    umum: 'gray',
  };
  return colors[specialization] || 'gray';
};

const getRoleText = (role) => {
  return role?.replace(/_/g, ' ') || 'N/A';
};

const getSpecializationText = (specialization) => {
  return specialization?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const TeamMemberCard = ({ member, onRemove }) => {
  const profile = member.profiles; // Asumsi: member.profiles berisi data user

  if (!profile) {
    return (
      <Card className="border-border">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Data anggota tim tidak ditemukan.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name || profile.email} />
            <AvatarFallback className="bg-accent text-accent-foreground">
              {profile.full_name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-center">
              <p className="font-bold text-sm text-foreground">
                {profile.full_name || profile.email}
              </p>
              <Badge variant={getRoleColor(member.role)} className="text-xs capitalize">
                {getRoleText(member.role)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {profile.email || '-'}
            </p>
            {profile.specialization && (
              <Badge variant={getSpecializationColor(profile.specialization)} className="text-xs capitalize">
                {getSpecializationText(profile.specialization)}
              </Badge>
            )}
          </div>
          {onRemove && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onRemove(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Hapus Anggota</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hapus Anggota</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamMemberCard;