
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Pencil,
  Globe,
  User as UserIcon,
  Mail,
  Briefcase,
  Target,
  Rocket,
  Info,
  BadgeDollarSign,
  UserCheck,
  TrendingUp,
  Network
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import type { StartupProfile } from "@/lib/types";
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

const InfoCard = ({ icon: Icon, title, value, link }: { icon: React.ElementType, title: string, value?: string | null, link?: string | null }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
            <div>
                <p className="font-semibold text-sm">{title}</p>
                {link ? 
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{value}</a>
                    : 
                    <p className="text-sm text-muted-foreground">{value}</p>
                }
            </div>
        </div>
    )
}

export default function StartupProfileViewPage() {
  const { userDetails, loading } = useAuth();
  const profile = userDetails?.profile as Partial<StartupProfile> | null;

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
                        <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                        <CardTitle>No Profile Found</CardTitle>
                        <CardDescription>It looks like you haven't created your profile yet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/startups/profile">Create Your Profile</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                 <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                            <Avatar className="w-24 h-24 mb-4 rounded-md">
                                <AvatarImage src={profile.companyLogoUrl} className="object-contain" />
                                <AvatarFallback className="text-3xl rounded-md">{getInitials(profile.companyName)}</AvatarFallback>
                            </Avatar>
                            <h1 className="text-2xl font-bold">{profile.companyName || ""}</h1>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                {Array.isArray(profile.industry) && profile.industry.map((ind: string) => (
                                    <Badge key={ind} variant="secondary">{ind}</Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Company Info</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <InfoCard icon={Globe} title="Website" value={profile.companyWebsite} link={profile.companyWebsite} />
                        <InfoCard icon={TrendingUp} title="Investment Stage" value={profile.investmentStage} />
                        <InfoCard icon={BadgeDollarSign} title="Total Raised" value={profile.investmentRaised} />
                        <InfoCard icon={Network} title="Lead Investor" value={profile.largestInvestor} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Primary Contact</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <InfoCard icon={UserIcon} title="Name" value={profile.userName} />
                        <InfoCard icon={Mail} title="Email" value={profile.userEmail} />
                        <InfoCard icon={Briefcase} title="Role" value={profile.yourRole} />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Rocket className="w-5 h-5 text-primary" /> Company Mission</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                       <p>{profile.shortDescription}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Current Challenge</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                        <p>{profile.currentChallenge}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-primary" /> Why Join Us?</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                       <p>{profile.whyUs}</p>
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
            <Link href="/startups/profile">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
            </Link>
        </Button>
        </div>
        {renderProfile()}
    </div>
  );
}
