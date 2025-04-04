"use client";

import type React from "react";

import { useState, useRef } from "react";
import { X, Send, Bold, Italic, List, LinkIcon, Paperclip, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

// Format relative time (e.g., "2 hours ago")
const formatRelativeTime = (dateString: string) => {
	if (!dateString || dateString === "null" || dateString === "undefined") {
		return "Unknown date";
	}

	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return dateString;
		return formatDistanceToNow(date, { addSuffix: true });
	} catch (error) {
		console.error("Error formatting date:", error);
		return dateString;
	}
};

// Component to render formatted text
const FormattedText = ({ text }: { text: string }) => {
	const isHtml = /<\/?[a-z][\s\S]*>/i.test(text);

	if (isHtml) {
		return (
			<div
				className="prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
				dangerouslySetInnerHTML={{ __html: text }}
			/>
		);
	} else {
		return (
			<div className="prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
				<ReactMarkdown>{text}</ReactMarkdown>
			</div>
		);
	}
};

interface TicketDetailProps {
	ticket: {
		id: number;
		title: string;
		status: string;
		priority: string;
		createdAt: string;
		dueDate?: string;
		description?: string;
		assignee: {
			name: string;
		};
		sentFrom?: {
			name: string;
		};
		user?: {
			name: string;
		};
	};
	onClose: () => void;
}

interface ConversationItem {
	id: number;
	message: string;
	timestamp: string;
	isPrivate?: boolean;
	user: {
		name: string;
	};
}

export function TicketDetail({ ticket, onClose }: TicketDetailProps) {
	const [isPrivateNote, setIsPrivateNote] = useState(false);
	const [replyText, setReplyText] = useState("");
	const [conversations, setConversations] = useState<ConversationItem[]>([]);
	const [showLinkDialog, setShowLinkDialog] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const [ticketStatus, setTicketStatus] = useState(ticket.status);
	const [isUpdating, setIsUpdating] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Setup TipTap editor
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				bulletList: { keepMarks: true, keepAttributes: false },
			}),
			Placeholder.configure({ placeholder: "Type your reply here..." }),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: { class: "text-primary underline" },
			}),
		],
		content: "",
		onUpdate: ({ editor }) => {
			setReplyText(editor.getHTML());
		},
	});

	// Handle sending a reply
	const handleSendReply = () => {
		if (!editor || !editor.getText().trim()) return;

		const newMessage: ConversationItem = {
			id: Date.now(),
			message: replyText,
			timestamp: "just now",
			isPrivate: isPrivateNote,
			user: ticket.assignee,
		};

		setConversations([newMessage, ...conversations]);
		setReplyText("");
		editor.commands.clearContent();
	};

	// Apply formatting to text
	const formatText = (format: "bold" | "italic" | "list" | "link" | "attachment") => {
		if (!editor && format !== "attachment") return;

		switch (format) {
			case "bold":
				editor?.chain().focus().toggleBold().run();
				break;
			case "italic":
				editor?.chain().focus().toggleItalic().run();
				break;
			case "list":
				editor?.chain().focus().toggleBulletList().run();
				break;
			case "link":
				setShowLinkDialog(true);
				break;
			case "attachment":
				fileInputRef.current?.click();
				break;
		}
	};

	// Add link to editor
	const handleAddLink = () => {
		if (editor && linkUrl) {
			editor.chain().focus().toggleLink({ href: linkUrl }).run();
			setShowLinkDialog(false);
			setLinkUrl("");
		}
	};

	// Handle file attachment
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0 && editor) {
			editor.chain().focus().insertContent(`[Archivo adjunto: ${files[0].name}]`).run();
		}
	};

	// Check if format is active
	const isFormatActive = (format: "bold" | "italic" | "list" | "link" | "attachment") => {
		if (!editor) return false;

		switch (format) {
			case "bold":
				return editor.isActive("bold");
			case "italic":
				return editor.isActive("italic");
			case "list":
				return editor.isActive("bulletList");
			case "link":
				return editor.isActive("link");
			default:
				return false;
		}
	};

	// Close ticket
	const handleCloseTicket = async () => {
		if (isUpdating) return;
		setIsUpdating(true);

		try {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 500));

			setTicketStatus("Closed");

			const newMessage: ConversationItem = {
				id: Date.now(),
				message: "Ticket has been closed by the agent.",
				timestamp: "just now",
				isPrivate: false,
				user: ticket.assignee,
			};

			setConversations([newMessage, ...conversations]);

			toast("Ticket closed", {
				description: "The ticket has been closed successfully.",
			});

			// Dispatch event to update UI
			window.dispatchEvent(
				new CustomEvent("ticket-updated", {
					detail: { id: ticket.id, status: "Closed" },
				})
			);
		} catch (error) {
			console.error("Error closing ticket:", error);
			toast.error("Error", {
				description: "An unexpected error occurred. Please try again.",
			});
		} finally {
			setIsUpdating(false);
		}
	};

	// Delete ticket
	const handleDeleteTicket = async () => {
		if (isUpdating) return;

		if (confirm("Are you sure you want to delete this ticket? This action cannot be undone.")) {
			setIsUpdating(true);

			try {
				// Simulate API call
				await new Promise((resolve) => setTimeout(resolve, 500));

				setTicketStatus("Deleted");

				toast("Ticket deleted", {
					description: "The ticket has been marked for deletion and will be permanently removed after 90 hours.",
				});

				// Dispatch event to update UI
				window.dispatchEvent(
					new CustomEvent("ticket-updated", {
						detail: { id: ticket.id, status: "Deleted" },
					})
				);

				// Close panel after delay
				setTimeout(onClose, 1500);
			} catch (error) {
				console.error("Error deleting ticket:", error);
				toast.error("Error", {
					description: "An unexpected error occurred. Please try again.",
				});
			} finally {
				setIsUpdating(false);
			}
		}
	};

	// Get badge variant based on status
	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "Closed":
				return "outline";
			case "Deleted":
				return "destructive";
			case "Completed":
				return "outline";
			case "In progress":
				return "default";
			default:
				return "secondary";
		}
	};

	// Get badge variant based on priority
	const getPriorityBadgeVariant = (priority: string) => {
		switch (priority) {
			case "High":
				return "destructive";
			case "Medium":
				return "default";
			default:
				return "secondary";
		}
	};

	return (
		<AnimatePresence>
			{/* Overlay */}
			<motion.div className="fixed inset-0 bg-black/30 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

			{/* Detail panel */}
			<motion.div
				className="fixed inset-y-0 right-0 w-1/2 bg-white shadow-xl flex flex-col z-50 overflow-hidden"
				initial={{ x: "100%" }}
				animate={{ x: 0 }}
				exit={{ x: "100%" }}
				transition={{ type: "spring", damping: 25, stiffness: 200 }}>
				{/* Header */}
				<div className="flex justify-between items-center p-4 border-b">
					<div className="font-semibold text-lg">#{ticket.id}</div>
					<Button variant="ghost" size="icon" onClick={onClose} title="Close">
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Content */}
				<div className="flex flex-1 overflow-hidden">
					{/* Main content */}
					<div className="flex-1 flex flex-col overflow-hidden">
						{/* Scrollable area */}
						<div className="flex-1 overflow-y-auto p-4 space-y-6">
							{/* Description */}
							<div className="bg-white rounded-lg border p-4">
								<h2 className="font-semibold text-lg mb-2">Description</h2>
								<div className="text-gray-700">
									{ticket.description ? <FormattedText text={ticket.description} /> : <p>No description provided.</p>}
								</div>
							</div>

							{/* Conversation */}
							<div className="bg-white rounded-lg border p-4">
								<h2 className="font-semibold text-lg mb-4">Conversation</h2>
								{conversations.length === 0 ? (
									<div className="text-center py-8 text-gray-500">No messages yet. Start the conversation by sending a reply.</div>
								) : (
									<div className="space-y-4">
										{conversations.map((item) => (
											<div key={item.id} className={`flex gap-3 ${item.isPrivate ? "bg-yellow-50 p-3 rounded-lg" : ""}`}>
												<Avatar className="h-8 w-8">
													<AvatarFallback>{item.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
												</Avatar>
												<div className="flex-1">
													<div className="flex justify-between items-center mb-1">
														<div className="flex items-center gap-2">
															<span className="font-medium">{item.user.name}</span>
															{item.isPrivate && (
																<Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
																	Private
																</Badge>
															)}
														</div>
														<span className="text-xs text-gray-500">{formatRelativeTime(item.timestamp)}</span>
													</div>
													<div className="text-sm">
														<FormattedText text={item.message} />
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Extra space to prevent content being covered by reply area */}
							<div className="h-[220px]"></div>
						</div>

						{/* Reply area */}
						<div className="bg-white border-t p-4 shadow-md">
							<div className="flex items-center gap-2 mb-2 border-b pb-2">
								<TooltipProvider>
									{["bold", "italic", "list", "link"].map((format) => (
										<Tooltip key={format}>
											<TooltipTrigger asChild>
												<Button
													variant={isFormatActive(format as any) ? "default" : "ghost"}
													size="icon"
													onClick={() => formatText(format as any)}>
													{format === "bold" && <Bold className="h-4 w-4" />}
													{format === "italic" && <Italic className="h-4 w-4" />}
													{format === "list" && <List className="h-4 w-4" />}
													{format === "link" && <LinkIcon className="h-4 w-4" />}
												</Button>
											</TooltipTrigger>
											<TooltipContent>{format.charAt(0).toUpperCase() + format.slice(1)}</TooltipContent>
										</Tooltip>
									))}

									<Tooltip>
										<TooltipTrigger asChild>
											<Button variant="ghost" size="icon" onClick={() => formatText("attachment")}>
												<Paperclip className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Attach File</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								{/* Hidden file input */}
								<input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
							</div>

							<div className="mb-3">
								<div className="min-h-[100px] max-h-[200px] mb-2 border rounded-md overflow-auto">
									<EditorContent editor={editor} className="prose prose-sm max-w-none" />
								</div>
							</div>

							<div className="flex justify-between items-center">
								<div className="flex items-center space-x-2">
									<Switch id="private-note" checked={isPrivateNote} onCheckedChange={setIsPrivateNote} />
									<Label htmlFor="private-note">Private Note</Label>
								</div>
								<Button onClick={handleSendReply} className="gap-2">
									<Send className="h-4 w-4" />
									Send Reply
								</Button>
							</div>
						</div>
					</div>

					{/* Details sidebar */}
					<div className="w-64 border-l p-4 overflow-y-auto flex flex-col">
						<h2 className="font-semibold text-lg mb-4">Details</h2>

						<div className="space-y-4 flex-1">
							<div>
								<h3 className="text-sm text-gray-500 mb-1">Status</h3>
								<Badge variant={getStatusBadgeVariant(ticketStatus)}>{ticketStatus}</Badge>
							</div>

							<div>
								<h3 className="text-sm text-gray-500 mb-1">Priority</h3>
								<Badge variant={getPriorityBadgeVariant(ticket.priority)}>{ticket.priority}</Badge>
							</div>

							<div>
								<h3 className="text-sm text-gray-500 mb-1">Created</h3>
								<p className="text-sm">{formatRelativeTime(ticket.createdAt)}</p>
							</div>

							{ticket.dueDate && (
								<div>
									<h3 className="text-sm text-gray-500 mb-1">Due Date</h3>
									<p className="text-sm">{formatRelativeTime(ticket.dueDate)}</p>
								</div>
							)}

							<div>
								<h3 className="text-sm text-gray-500 mb-1">Assigned to</h3>
								<div className="flex items-center gap-2">
									<Avatar className="h-6 w-6">
										<AvatarFallback>{ticket.sent_to.name.substring(0, 2).toUpperCase()}</AvatarFallback>
									</Avatar>
									<span className="text-sm">{ticket.sent_to.name}</span>
								</div>
							</div>

							<div>
								<h3 className="text-sm text-gray-500 mb-1">User</h3>
								<div className="flex items-center gap-2">
									<Avatar className="h-6 w-6">
										<AvatarFallback>
											{ticket.user?.name
												? ticket.user.name.substring(0, 2).toUpperCase()
												: ticket.sentFrom?.name
												? ticket.sentFrom.name.substring(0, 2).toUpperCase()
												: "UN"}
										</AvatarFallback>
									</Avatar>
									<span className="text-sm">{ticket.user?.name || ticket.sentFrom?.name || "Unknown User"}</span>
								</div>
							</div>
						</div>

						{/* Action buttons */}
						<div className="mt-auto pt-4 border-t">
							<div className="flex flex-col gap-2">
								<Button
									variant="outline"
									size="sm"
									className="w-full gap-1 text-gray-600"
									title="Close Ticket"
									onClick={handleCloseTicket}
									disabled={ticketStatus === "Closed"}>
									<Check className="h-4 w-4" />
									Close Ticket
								</Button>
								<div className="text-center">
									<button onClick={handleDeleteTicket} className="text-xs text-red-500 hover:underline">
										Delete
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Link dialog */}
				<Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Add Link</DialogTitle>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="link-url" className="text-right">
									URL
								</Label>
								<Input
									id="link-url"
									placeholder="https://example.com"
									value={linkUrl}
									onChange={(e) => setLinkUrl(e.target.value)}
									className="col-span-3"
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setShowLinkDialog(false)}>
								Cancel
							</Button>
							<Button onClick={handleAddLink}>Add Link</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</motion.div>
		</AnimatePresence>
	);
}
