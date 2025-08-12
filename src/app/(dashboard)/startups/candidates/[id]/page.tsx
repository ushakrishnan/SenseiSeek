
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Linkedin,
  Globe,
  Link as LinkIcon,
  MapPin,
  Clock,
  DollarSign,
  Star,
  ArrowLeft,
  MessageSquare,
  Send,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getExecutiveProfileById, toggleShortlistExecutive, startConversation, generateInitialMessage } from "@/lib/actions";
import type { ExecutiveProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { analytics } from "@/lib/firebase-client";
import { logEvent } from "firebase/analytics";

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
  const { user, userDetails } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { id } = params;
  const from = searchParams.get('from');

  const [profile, setProfile] = useState<(Partial<ExecutiveProfile> & { isShortlisted?: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShortlisting, startShortlistTransition] = useTransition();
  const [isGeneratingMessage, startGeneratingMessageTransition] = useTransition();
  const [isSendingMessage, startSendingMessageTransition] = useTransition();
  
  const [showContactForm, setShowContactForm] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  
  const { toast } = useToast();

  const backLink = from === 'applicants' ? '/startups/applicants' : from === 'shortlisted' ? '/startups/shortlisted' : '/startups/find-talent';
  const backText = from === 'applicants' ? 'Back to Applicants' : from === 'shortlisted' ? 'Back to Shortlisted' : 'Back to Find Talent';

  useEffect(() => {
    if (!user || typeof id !== 'string') {
        setIsLoading(false);
        return;
    };

    async function fetchProfile() {
      const result = await getExecutiveProfileById(user!.uid, id as string);
      if (result.status === 'success') {
        setProfile(result.profile);
        if (analytics && result.profile) {
            logEvent(analytics, 'view_item', {
                content_type: 'executive_profile',
                item_id: result.profile.id,
                item_name: result.profile.name,
            });
        }
      } else {
        toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
        });
      }
      setIsLoading(false);
    }

    fetchProfile();
  }, [user, id, toast]);
  
  const handleShortlistToggle = () => {
    if (!user || !profile?.id) return;
    
    startShortlistTransition(async () => {
        const originalShortlistedState = profile.isShortlisted;
        // Optimistic update
        setProfile(p => p ? { ...p, isShortlisted: !p.isShortlisted } : null);

        const result = await toggleShortlistExecutive(user.uid, profile.id, !!originalShortlistedState);
        if (result.status === 'error') {
            // Revert on error
            setProfile(p => p ? { ...p, isShortlisted: originalShortlistedState } : null);
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        } else {
            const newStateIsShortlisted = result.newState === 'shortlisted';
            if (analytics) {
                logEvent(analytics, 'add_to_wishlist', {
                    value: newStateIsShortlisted ? 1 : -1,
                    item_id: profile.id,
                    content_type: 'executive_profile',
                });
            }
            toast({ title: 'Success', description: result.message });
        }
    })
  }

  const handleOpenContactForm = () => {
    if (!user || !profile?.id || !userDetails?.profile) return;
    
    setShowContactForm(true);

    startGeneratingMessageTransition(async () => {
        const result = await generateInitialMessage({
            executiveId: profile.id!,
            startupId: user.uid,
        });
        
        if (result.status === 'success' && result.message) {
            setMessageContent(result.message);
        } else {
             toast({
                title: "Error Generating Message",
                description: result.message,
                variant: 'destructive',
            });
            setShowContactForm(false);
        }
    });
  }

  const handleSendMessage = () => {
    if (!user || !profile?.id) return;

    startSendingMessageTransition(async () => {
        const result = await startConversation({
            initiator: 'startup',
            startupId: user.uid,
            executiveId: profile.id!,
            message: messageContent,
        });
        
        if (result.status === 'success') {
            if (analytics) {
                logEvent(analytics, 'share', {
                    method: 'contact_executive',
                    content_type: 'executive_profile',
                    item_id: profile.id,
                });
            }
            setShowContactForm(false);
            setMessageContent("");
            toast({
                title: "Message Sent!",
                description: "You can now view the conversation in your inbox.",
            });
            router.push('/startups/inbox');
        } else {
             toast({
                title: "Error Sending Message",
                description: result.message,
                variant: 'destructive',
            });
        }
    });
  }


  const renderProfile = () => {
    if (isLoading) {
       return (
        <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading applicant's profile...</p>
        </div>
       )
    }

    if (!profile) {
        return (
             <div className="text-center py-12">
                <Card>
                    <CardHeader>
                        <CardTitle>No Profile Found</CardTitle>
                        <CardDescription>Could not load applicant's profile.</CardDescription>
                    </CardHeader>
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
                            <Avatar className="w-24 h-24 mb-4">
                                <AvatarImage src={profile.photoUrl} />
                                <AvatarFallback className="text-3xl">{getInitials(profile.name)}</AvatarFallback>
                            </Avatar>
                            <h1 className="text-2xl font-bold">{profile.name || ""}</h1>
                             <div className="mt-4 flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleShortlistToggle} disabled={isShortlisting}>
                                    <Star className={cn("mr-2 h-4 w-4", profile.isShortlisted && "text-amber-400 fill-amber-400")} />
                                    {isShortlisting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {profile.isShortlisted ? 'Shortlisted' : 'Shortlist'}
                                </Button>
                                 <Button size="sm" onClick={handleOpenContactForm} disabled={isGeneratingMessage || showContactForm}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    {isGeneratingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Contact'}
                                </Button>
                            </div>
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
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{profile.locationPreference}</span>
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
                        {profile.industryExperience?.map((skill: string) => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                 {showContactForm && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact {profile.name}</CardTitle>
                            <CardDescription>Review and edit the AI-generated message below before sending.</CardDescription>
                        </CardHeader>
                         <CardContent className="space-y-4">
                            {isGeneratingMessage ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <p>Generating message...</p>
                                </div>
                            ) : (
                                <Textarea 
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    rows={12}
                                />
                            )}
                         </CardContent>
                         <CardFooter className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowContactForm(false)}>Cancel</Button>
                             <Button onClick={handleSendMessage} disabled={isSendingMessage || isGeneratingMessage || !messageContent.trim()}>
                                {isSendingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                                Send Message
                            </Button>
                         </CardFooter>
                    </Card>
                )}
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
                        {profile.keyAccomplishments?.map((accomplishment, index) => (
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
        <div className="flex justify-start mb-6">
        <Button asChild variant="outline">
            <Link href={backLink}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backText}
            </Link>
        </Button>
        </div>
        {renderProfile()}
    </div>
  );
}
