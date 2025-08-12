
"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { getStartupNeed, applyForOpportunity, startConversation, generateFollowUpMessage } from "@/lib/actions";
import type { StartupNeeds, StartupProfile, ExecutiveProfile } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Briefcase, DollarSign, Clock, MapPin, CheckCircle, Info, Building, Link as LinkIcon, AlertCircle, Rocket, Target, User, Mail, BadgeDollarSign, TrendingUp, Network, MessageSquare, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SaveButton } from "../find/find-opportunities-client";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { analytics } from "@/lib/firebase-client";
import { logEvent } from "firebase/analytics";
import { Textarea } from "@/components/ui/textarea";

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
            <Icon className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div>
                <p className="font-semibold text-sm text-foreground">{title}</p>
                {link ? 
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{value}</a>
                    : 
                    <p className="text-sm text-muted-foreground">{value}</p>
                }
            </div>
        </div>
    )
}

export function OpportunityClient() {
  const { user, userDetails } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { toast } = useToast();
  const [need, setNeed] = useState<StartupNeeds | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, startApplying] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [showContactForm, setShowContactForm] = useState(false);
  const [isGeneratingMessage, startGeneratingMessageTransition] = useTransition();
  const [isSendingMessage, startSendingMessageTransition] = useTransition();
  const [messageContent, setMessageContent] = useState("");

  useEffect(() => {
    if (typeof id === 'string') {
      setIsLoading(true);
      getStartupNeed(id, user?.uid)
        .then((result) => {
          if (result.status === "success" && result.need) {
            setNeed(result.need);
             if (analytics) {
                logEvent(analytics, 'view_item', {
                    content_type: 'opportunity',
                    item_id: result.need.id,
                    item_name: result.need.roleTitle,
                });
            }
          } else {
            setError(result.message);
            toast({ title: "Error", description: result.message, variant: "destructive" });
          }
        })
        .catch((err) => {
            const msg = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(msg);
            toast({ title: "Error", description: msg, variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    }
  }, [id, user, toast]);
  
  const handleApply = () => {
    if (!need || !user) {
        toast({ title: "Error", description: "You must be logged in to apply.", variant: 'destructive'});
        return;
    }
    
    startApplying(async () => {
        const result = await applyForOpportunity(need.id, user.uid);
        if (result.status === 'success') {
            if (analytics) {
                logEvent(analytics, 'generate_lead', {
                    value: 1,
                    currency: 'USD', // Assuming a standard currency
                    item_id: need.id,
                    item_name: need.roleTitle,
                });
            }
            toast({ title: "Success!", description: result.message });
            setNeed(prev => prev ? { ...prev, isApplied: true } : null);
        } else {
            toast({ title: "Error", description: result.message, variant: 'destructive'});
        }
    })
  }
  
  const handleOpenContactForm = () => {
    if (!user || !need?.id) return;
    setShowContactForm(true);

    startGeneratingMessageTransition(async () => {
        const result = await generateFollowUpMessage({ executiveId: user.uid, needId: need.id });
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
    if (!need || !user || !userDetails?.profile) return;
    
    startSendingMessageTransition(async () => {
        const result = await startConversation({
            initiator: 'executive',
            executiveId: user.uid,
            startupId: need.creatorId!,
            needId: need.id,
            message: messageContent,
        });

        if (result.status === 'success') {
             if (analytics) {
                logEvent(analytics, 'share', {
                    method: 'contact_startup',
                    content_type: 'opportunity',
                    item_id: need.id,
                });
            }
            setShowContactForm(false);
            setMessageContent('');
            toast({
                title: "Conversation Started!",
                description: "You can view the conversation in your inbox.",
            });
            router.push('/executives/inbox');
        } else {
            toast({ title: "Error", description: result.message, variant: 'destructive' })
        }
    })
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading opportunity details...</p>
      </div>
    );
  }

  if (error || !need) {
    return (
        <Card className="text-center">
            <CardHeader>
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <CardTitle>Error</CardTitle>
                <CardDescription>{error || "Could not find the requested opportunity."}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/executives/opportunities/find">Back to Opportunities</Link>
                </Button>
            </CardContent>
        </Card>
    );
  }
  
  const startupProfile = need.startupProfile;

  return (
    <div className="space-y-6">
      {showContactForm && (
          <Card>
              <CardHeader>
                  <CardTitle>Contact {need.companyName}</CardTitle>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="text-3xl font-bold">{need.roleTitle}</CardTitle>
                      <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-4 w-4" />
                          <span>{need.companyName}</span>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <div className="flex flex-wrap gap-2 mb-6">
                          <Badge variant="secondary" className="flex items-center"><MapPin className="mr-1.5 h-3 w-3"/>{need.locationPreference}</Badge>
                          <Badge variant="secondary" className="flex items-center"><DollarSign className="mr-1.5 h-3 w-3"/>{need.budget}</Badge>
                          <Badge variant="secondary" className="flex items-center"><Clock className="mr-1.5 h-3 w-3"/>{need.engagementLength}</Badge>
                          <Badge variant="secondary" className="flex items-center"><Briefcase className="mr-1.5 h-3 w-3"/>{need.companyStage}</Badge>
                      </div>
                      <Separator className="my-6"/>
                      <div className="space-y-6 prose prose-sm dark:prose-invert max-w-none">
                          <div>
                              <h3 className="font-semibold text-foreground">Role Summary</h3>
                              <p className="text-muted-foreground">{need.roleSummary}</p>
                          </div>
                          <div>
                              <h3 className="font-semibold text-foreground">Key Deliverables</h3>
                              <p className="text-muted-foreground whitespace-pre-wrap">{need.keyDeliverables}</p>
                          </div>
                          {need.keyChallenges && (
                              <div>
                                  <h3 className="font-semibold text-foreground">Key Challenges</h3>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{need.keyChallenges}</p>
                              </div>
                          )}
                          <div>
                              <h3 className="font-semibold text-foreground">Required Expertise</h3>
                              <div className="flex flex-wrap gap-2">
                                  {(Array.isArray(need.requiredExpertise) ? need.requiredExpertise : need.requiredExpertise.split(',')).map(skill => (
                                      <Badge key={skill} variant="outline">{skill.trim()}</Badge>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </div>
          <div className="lg:col-span-1 space-y-6 sticky top-24">
              <Card>
                  <CardHeader>
                      <CardTitle>Take Action</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      <Button 
                          className="w-full" 
                          onClick={handleApply}
                          disabled={isApplying || need.isApplied}
                      >
                          {isApplying ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Applying...</>
                          ) : need.isApplied ? (
                            <><CheckCircle className="mr-2 h-4 w-4"/> Applied</>
                          ) : "Apply Now"}
                      </Button>
                      <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={handleOpenContactForm}
                          disabled={!need.isApplied || showContactForm}
                      >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          {isGeneratingMessage ? 'Generating...' : 'Contact Startup'}
                      </Button>
                      <SaveButton needId={need.id} isInitiallySaved={need.isSaved} />
                  </CardContent>
                  {need.isApplied && !showContactForm && (
                      <CardFooter>
                          <p className="text-xs text-muted-foreground text-center w-full">You can track your application status on the "My Applications" page.</p>
                      </CardFooter>
                  )}
              </Card>
              {startupProfile && (
                  <Card>
                      <CardHeader className="text-center flex flex-col items-center">
                          <Avatar className="h-20 w-20 rounded-md">
                              <AvatarImage src={startupProfile.companyLogoUrl} className="object-contain" />
                              <AvatarFallback className="rounded-md">{getInitials(startupProfile.companyName)}</AvatarFallback>
                          </Avatar>
                          <CardTitle>{startupProfile.companyName}</CardTitle>
                          <div className="flex flex-wrap justify-center gap-1 pt-2">
                              {startupProfile.industry?.map(ind => <Badge key={ind} variant="secondary">{ind}</Badge>)}
                          </div>
                      </CardHeader>
                      <CardContent className="text-sm space-y-4">
                          <div>
                              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2"><Rocket className="h-4 w-4 text-primary" /> Mission</h4>
                              <p className="text-muted-foreground line-clamp-3">{startupProfile.shortDescription}</p>
                          </div>
                          <Separator/>
                          <div>
                              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2"><Info className="h-4 w-4 text-primary" /> Company Details</h4>
                              <div className="space-y-3">
                                  <InfoCard icon={LinkIcon} title="Website" value={startupProfile.companyWebsite} link={startupProfile.companyWebsite} />
                                  <InfoCard icon={TrendingUp} title="Investment Stage" value={startupProfile.investmentStage} />
                                  <InfoCard icon={BadgeDollarSign} title="Total Raised" value={startupProfile.investmentRaised} />
                                  <InfoCard icon={Network} title="Lead Investor" value={startupProfile.largestInvestor} />
                              </div>
                          </div>
                          <Separator/>
                          <div>
                              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2"><User className="h-4 w-4 text-primary" /> Primary Contact</h4>
                              <div className="space-y-3">
                                  <InfoCard icon={User} title="Name" value={startupProfile.userName} />
                                  <InfoCard icon={Briefcase} title="Role" value={startupProfile.yourRole} />
                              </div>
                          </div>
                      </CardContent>
                  </Card>
              )}
          </div>
      </div>
    </div>
  );
}
