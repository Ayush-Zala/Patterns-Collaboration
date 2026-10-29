"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, RemoveFormatting, Type, List, ListOrdered, Link2, Image as ImageIcon, Smile, Paperclip } from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base prose-invert min-h-[250px] bg-transparent border-0 resize-none focus-visible:outline-none p-4 text-zinc-300 max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep content synced if it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="bg-[#21222c] rounded-xl border border-zinc-800 flex flex-col overflow-hidden focus-within:ring-1 focus-within:ring-zinc-700">
      <EditorContent editor={editor} className="min-h-[250px]" />
      
      <div className="border-t border-zinc-800 p-2 flex items-center justify-between bg-[#1a1b22]">
        <div className="flex items-center space-x-1 text-zinc-400">
          <Select defaultValue="sans-serif">
            <SelectTrigger className="h-8 border-transparent bg-transparent hover:bg-zinc-800 focus:ring-0 w-[110px] text-xs">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sans-serif">Sans-Serif</SelectItem>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="mono">Monospace</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="14">
            <SelectTrigger className="h-8 border-transparent bg-transparent hover:bg-zinc-800 focus:ring-0 w-[60px] text-xs">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="16">16</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}><RemoveFormatting className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 hover:text-white ${editor.isActive('bold') ? 'bg-zinc-800 text-white' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 hover:text-white ${editor.isActive('italic') ? 'bg-zinc-800 text-white' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 hover:text-white ${editor.isActive('underline') ? 'bg-zinc-800 text-white' : ''}`} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 hover:text-white ${editor.isActive('strike') ? 'bg-zinc-800 text-white' : ''}`} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></Button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className={`h-8 w-8 hover:text-white ${editor.isActive('bulletList') ? 'bg-zinc-800 text-white' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 hover:text-white ${editor.isActive('orderedList') ? 'bg-zinc-800 text-white' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 hover:text-white ${editor.isActive('link') ? 'bg-zinc-800 text-white' : ''}`} onClick={setLink}><Link2 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white"><ImageIcon className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="p-3 bg-[#1a1b22] border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
            <Smile className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
            <Paperclip className="w-4 h-4 mr-2" />
            Attach files
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-8 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
          Send a test email
        </Button>
      </div>
    </div>
  );
}
