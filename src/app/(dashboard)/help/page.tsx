
'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wand2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// A simple, safe markdown parser that renders React components.
function SafeMarkdownParser({ content }: { content: string }) {
  const elements = content.split('\n').map((line, index) => {
    if (line.startsWith('### ')) {
      return <h4 key={index} className="text-xl font-semibold mt-6 mb-3">{line.substring(4)}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-3xl font-bold font-headline mt-8 mb-4 pb-2 border-b">{line.substring(3)}</h2>;
    }
    if (line.startsWith('-   ')) {
       // Handle list items, including nested icons
       const formattedLine = line.substring(4);
       const parts = formattedLine.split(/(<Wand2Icon \/>)/g).filter(part => part);
       const listItemContent = parts.map((part, partIndex) => {
          if (part === '<Wand2Icon />') {
            return <Wand2 key={partIndex} className="inline-block h-4 w-4 text-primary" />;
          }
          // Use dangerouslySetInnerHTML only for the bold tag, which is controlled.
          const boldedPart = part.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>');
          return <span key={partIndex} dangerouslySetInnerHTML={{ __html: boldedPart }} />;
       });
       return <li key={index}>{listItemContent}</li>;
    }
    if (line.startsWith('---')) {
      return <hr key={index} className="my-8" />;
    }
    if (line.trim() === '') {
        return null; // Don't render empty paragraphs
    }
    
    // This part handles inline strong tags and icons within paragraphs
    const parts = line.split(/(<Wand2Icon \/>|\*\*.*?\*\*)/g).filter(part => part);
    const paragraphContent = parts.map((part, partIndex) => {
        if (part === '<Wand2Icon />') {
            return <Wand2 key={partIndex} className="inline-block h-4 w-4 text-primary" />;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIndex} className="text-foreground">{part.slice(2, -2)}</strong>;
        }
        return part;
    });

    return <p key={index} className="leading-relaxed">{paragraphContent}</p>;
  });

  // Group list items into <ul> tags
  const groupedElements = [];
  let listItems: React.ReactNode[] = [];

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element?.type === 'li') {
      listItems.push(element);
    } else {
      if (listItems.length > 0) {
        groupedElements.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-3 pl-4">{listItems}</ul>);
        listItems = [];
      }
      groupedElements.push(element);
    }
  }
  if (listItems.length > 0) {
    groupedElements.push(<ul key="ul-end" className="list-disc list-inside space-y-3 pl-4">{listItems}</ul>);
  }

  return <div className="space-y-4 text-muted-foreground">{groupedElements}</div>;
}


export default function HelpPage() {
    const { userDetails, loading } = useAuth();
    const [content, setContent] = useState('');

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await fetch('/api/help-content');
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.statusText}`);
                }
                const text = await response.text();

                if (!userDetails?.role) {
                    setContent(text);
                    return;
                }

                const role = userDetails.role;
                let roleContent = '';

                // Extract content based on role
                const sections = text.split('---');
                const roleMap: {[key: string]: number} = {
                    'executive': 0,
                    'startup': 1,
                    'admin': 2
                }

                const sectionIndex = roleMap[role];
                if (sections[sectionIndex]) {
                     roleContent = sections[sectionIndex];
                } else {
                    roleContent = "Help content for your role could not be found."
                }
                
                setContent(roleContent);

            } catch (error) {
                console.error("Failed to fetch help content:", error);
                setContent("Could not load help content. Please try again later.");
            }
        };

        if (!loading && userDetails) {
            fetchContent();
        }

    }, [userDetails, loading]);
    
    if (loading || !content) {
        return (
             <div className="text-center py-12">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading help documentation...</p>
            </div>
        )
    }

    return (
        <Card>
            <CardContent className="p-6 md:p-8">
                <SafeMarkdownParser content={content} />
            </CardContent>
        </Card>
    )
}
