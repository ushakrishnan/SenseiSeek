

"use client";

import React, { useEffect, useState, useTransition, useRef, useActionState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getConversationsForUser, getMessagesForConversation, sendMessage, markConversationAsRead, rewriteMessage as rewriteMessageAction, startOrGetAdminConversation } from "@/lib/actions";
import type { ConversationWithRecipient, Message } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, Send, Check, CheckCheck, Wand2, Megaphone, Reply } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";

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

const MessageStatus = ({ isRead }: { isRead: boolean }) => {
    if (isRead) {
        return <CheckCheck className="h-4 w-4 text-white" />;
    }
    return <Check className="h-4 w-4 text-white" />;
};


export function InboxClient() {
    const { user, refetchUnreadCount } = useAuth();
    const { toast } = useToast();
    const [conversations, setConversations] = useState<ConversationWithRecipient[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, startSending] = useTransition();
    const [isRewritePending, startRewriteTransition] = useTransition();

    const [rewriteState, rewriteAction] = useActionState(rewriteMessageAction, {status: 'idle', rewrittenText: '', message: ''});


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const firstUnreadRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (behavior: 'smooth' | 'auto' = 'auto') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }

    useEffect(() => {
        scrollToBottom();
        if (user) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.senderId !== user.uid && firstUnreadRef.current) {
                firstUnreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [messages, user]);

    const fetchConversations = React.useCallback(async (userId: string) => {
        setIsLoadingConversations(true);
        try {
            const result = await getConversationsForUser(userId);
            if (result.status === 'success' && result.conversations) {
                setConversations(result.conversations);
                if (result.conversations.length > 0 && !selectedConversationId) {
                    setSelectedConversationId(result.conversations[0].id);
                }
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        } finally {
            setIsLoadingConversations(false);
        }
    }, [toast, selectedConversationId]);


    useEffect(() => {
        if (user) {
            fetchConversations(user.uid);
        } else {
            setIsLoadingConversations(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

     useEffect(() => {
        if (selectedConversationId && user) {
            const loadAndMarkMessages = async () => {
                setIsLoadingMessages(true);
                setMessages([]);
                
                try {
                    await markConversationAsRead(user.uid, selectedConversationId);
    
                    // Then, refetch everything to update the UI
                    const [messagesResult, conversationsResult, _] = await Promise.all([
                        getMessagesForConversation(selectedConversationId, user.uid),
                        getConversationsForUser(user.uid),
                        refetchUnreadCount()
                    ]);

                    if (messagesResult.status === 'success' && messagesResult.messages) {
                        setMessages(messagesResult.messages);
                    } else {
                        toast({ title: "Error loading messages", description: messagesResult.message, variant: "destructive" });
                    }

                    if (conversationsResult.status === 'success' && conversationsResult.conversations) {
                        setConversations(conversationsResult.conversations);
                    }
                } catch (e: any) {
                     console.error("Error marking conversation as read:", e);
                    toast({ title: "Error", description: e.message, variant: "destructive" });
                } finally {
                    setIsLoadingMessages(false);
                }
            };
            
            loadAndMarkMessages();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConversationId, user, toast]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversationId || !user) return;

        startSending(async () => {
            const tempId = `temp-${Date.now()}`;
            const optimisticMessage: Message = {
                id: tempId,
                conversationId: selectedConversationId,
                senderId: user.uid,
                text: newMessage,
                createdAt: new Date().toISOString(),
                status: 'sent',
                isReadByRecipient: false,
                isBroadcast: false,
            };

            setMessages(prev => [...prev, optimisticMessage]);
            scrollToBottom('smooth');
            const messageToSend = newMessage;
            setNewMessage("");

            const result = await sendMessage({
                conversationId: selectedConversationId,
                senderId: user.uid,
                text: messageToSend,
            });

            if (result.status === 'error') {
                toast({ title: "Message failed to send", description: result.message, variant: 'destructive' });
                setMessages(prev => prev.filter(m => m.id !== tempId));
                setNewMessage(messageToSend); // Restore text
            } else {
                 if (user) {
                    fetchConversations(user.uid);
                 }
            }
        });
    }
    
    const handleReplyToBroadcast = async (broadcastMessage: Message) => {
        if (!user) return;

        const result = await startOrGetAdminConversation(user.uid, `Re: "${broadcastMessage.text.substring(0, 50)}..."`);
        if (result.status === 'success' && result.conversationId) {
            setSelectedConversationId(result.conversationId);
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };


    const handleRewrite = () => {
        if (!newMessage.trim()) return;
        startRewriteTransition(() => {
            rewriteAction({ currentValue: newMessage });
        })
    }

    useEffect(() => {
        if (rewriteState.status === 'success' && rewriteState.rewrittenText) {
            setNewMessage(rewriteState.rewrittenText);
            toast({ title: 'Message Rewritten', description: 'Your message has been enhanced by AI.' });
        } else if (rewriteState.status === 'error') {
            toast({ title: 'Error', description: rewriteState.message, variant: 'destructive' });
        }
    }, [rewriteState, toast]);
    
    if (isLoadingConversations) {
        return (
            <div className="text-center py-12">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading your inbox...</p>
            </div>
        );
    }
    
    if (conversations.length === 0) {
        return (
            <Card className="text-center py-12">
                <CardHeader>
                    <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                    <CardTitle>No Conversations Yet</CardTitle>
                    <CardDescription>When users contact you, conversations will appear here.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    const selectedConversation = conversations.find(c => c.id === selectedConversationId);
    
    let firstUnreadIndex = -1;
    if (user && selectedConversation) {
        const unreadMessages = messages.filter(m => !m.isReadByRecipient && m.senderId !== user.uid);
        if (unreadMessages.length > 0) {
            const firstUnreadMessageId = unreadMessages[0].id;
            firstUnreadIndex = messages.findIndex(m => m.id === firstUnreadMessageId);
        }
    }

    return (
        <Card className="h-[calc(100vh-12rem)] overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel defaultSize={30} minSize={20}>
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b">
                            <h2 className="text-xl font-bold">Conversations</h2>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="flex flex-col">
                                {conversations.map(convo => {
                                    const isUnread = user && convo.unreadCounts && convo.unreadCounts[user.uid] > 0;
                                    return (
                                        <button 
                                            key={convo.id} 
                                            onClick={() => setSelectedConversationId(convo.id)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 text-left hover:bg-accent",
                                                selectedConversationId === convo.id && "bg-accent"
                                            )}
                                        >
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={convo.recipientAvatarUrl} className="object-cover" />
                                                <AvatarFallback>{getInitials(convo.recipientName)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 truncate">
                                                <div className="flex justify-between items-center">
                                                    <h3 className={cn("font-semibold", isUnread && "text-primary")}>{convo.recipientName}</h3>
                                                    {isUnread && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-primary"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate">
                                                  {convo.lastMessageText && convo.lastMessageText.length > 30
                                                      ? `${convo.lastMessageText.substring(0, 30)}...`
                                                      : convo.lastMessageText}
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={70}>
                    <div className="flex flex-col h-full">
                        {selectedConversation ? (
                            <>
                                <div className="p-4 border-b flex items-center gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={selectedConversation.recipientAvatarUrl} className="object-cover" />
                                        <AvatarFallback>{getInitials(selectedConversation.recipientName)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold">{selectedConversation.recipientName}</h3>
                                        <p className="text-xs text-muted-foreground">Last message {formatDistanceToNow(new Date(selectedConversation.lastMessageAt), { addSuffix: true })}</p>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 p-6 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                                    {isLoadingMessages ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {messages.map((message, index) => {
                                                const showDivider = index === firstUnreadIndex;
                                                return (
                                                    <React.Fragment key={message.id}>
                                                    {showDivider && (
                                                        <div ref={firstUnreadRef} className="relative py-2">
                                                             <Separator />
                                                            <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-secondary px-2 text-xs text-primary font-semibold">
                                                                Unread Messages
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className={cn(
                                                        "flex gap-3",
                                                        message.senderId === user?.uid ? "justify-end" : "justify-start"
                                                    )}>
                                                        {message.isBroadcast && message.senderId !== user?.uid && <Megaphone className="h-5 w-5 text-muted-foreground mt-1" />}
                                                        <div className={cn(
                                                            "p-3 rounded-lg max-w-md",
                                                            message.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-secondary"
                                                        )}>
                                                            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                                             <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                                                <span className="text-xs opacity-70">
                                                                    {isToday(new Date(message.createdAt))
                                                                        ? format(new Date(message.createdAt), 'p')
                                                                        : format(new Date(message.createdAt), 'MMM d, p')}
                                                                </span>
                                                                {message.senderId === user?.uid && !message.isBroadcast && (
                                                                     <MessageStatus isRead={message.isReadByRecipient} />
                                                                )}
                                                            </div>
                                                            {message.isBroadcast && message.senderId !== user?.uid && (
                                                                <Button variant="ghost" size="sm" className="w-full justify-start mt-2 text-xs h-7" onClick={() => handleReplyToBroadcast(message)}>
                                                                    <Reply className="mr-2 h-3 w-3" />
                                                                    Reply to Support
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    </React.Fragment>
                                                )
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </ScrollArea>
                                {!selectedConversation.isBroadcast && (
                                <div className="p-4 border-t bg-background">
                                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative flex items-center gap-2">
                                        <Textarea 
                                            placeholder="Type your message..."
                                            className="flex-1 pr-20"
                                            rows={1}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                        />
                                        <div className="absolute right-6 flex items-center gap-1">
                                            <Button type="button" size="icon" variant="ghost" onClick={handleRewrite} disabled={isRewritePending || !newMessage.trim()}>
                                                {isRewritePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-primary"/>}
                                            </Button>
                                            <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Info className="h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">Select a conversation</h3>
                                <p className="text-muted-foreground">Choose a conversation from the list to see the messages.</p>
                            </div>
                        )}
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </Card>
    )
}
