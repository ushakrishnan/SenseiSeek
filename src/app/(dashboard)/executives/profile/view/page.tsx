
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Pencil,
  Linkedin,
  Globe,
  Link as LinkIcon,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import type { ExecutiveProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const getInitials = (name: string | null | undefined) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[1]) {
      return `${names[0][0]}${names[1][0]}`;
    }
    if (name) {
      return name.substring(0, 2);
    }
    return "";
};

export default function ExecutiveProfileViewPage() {
  const { userDetails, loading } = useAuth();
  const profile = userDetails?.profile as Partial<ExecutiveProfile> | null;

  const renderProfile = () => {
    if (loading) {
       return (
        <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
       )
    }

    if (!profile) {
        return (
             <div className="text-center py-12">
                <Card>
                    <CardHeader>
                        <CardTitle>No Profile Found</CardTitle>
                        <CardDescription>It looks like you haven't created your profile yet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/executives/profile">Create Your Profile</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const locationString = [profile.city, profile.state, profile.country].filter(Boolean).join(', ');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                 <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                            <Avatar className="w-24 h-24 mb-4">
                                <AvatarImage key={profile.photoUrl} src={profile.photoUrl || ""} className="object-cover" />
                                <AvatarFallback className="text-3xl">{getInitials(profile.name)}</AvatarFallback>
                            </Avatar>
                            <h1 className="text-2xl font-bold">{profile.name || ""}</h1>
                             {locationString && (
                                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {locationString}
                                </p>
                            )}
                            <div className="mt-4 flex gap-4">
                                {profile.links?.linkedinProfile && (
                                    <Button variant="outline" size="icon" asChild>
                                        <a href={profile.links.linkedinProfile} target="_blank" rel="noopener noreferrer"><Linkedin /></a>
                                    </Button>
                                )}
                                {profile.links?.personalWebsite && (
                                     <Button variant="outline" size="icon" asChild>
                                        <a href={profile.links.personalWebsite} target="_blank" rel="noopener noreferrer"><Globe /></a>
                                    </Button>
                                )}
                                {profile.links?.portfolio && (
                                     <Button variant="outline" size="icon" asChild>
                                        <a href={profile.links.portfolio} target="_blank" rel="noopener noreferrer"><LinkIcon /></a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Details & Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                         <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="w-4 h-4" />
                            <span>Prefers <span className="font-semibold text-foreground">{profile.locationPreference}</span> work</span>
                        </div>
                         <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{profile.availability}</span>
                        </div>
                         <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            <span>{profile.desiredCompensation}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Skills</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {Array.isArray(profile.industryExperience) && profile.industryExperience.map((skill: string) => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Expertise Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                        <p>{profile.expertise}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Key Accomplishments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.isArray(profile.keyAccomplishments) && profile.keyAccomplishments.map((accomplishment, index) => (
                           <div key={index} className="flex items-start gap-4">
                                <Star className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                                <p className="text-muted-foreground">{accomplishment.value}</p>
                           </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
  }

  return (
    <div className="mx-auto">
        <div className="flex justify-end mb-6">
        <Button asChild>
            <Link href="/executives/profile">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
            </Link>
        </Button>
        </div>
        {renderProfile()}
    </div>
  );
}
