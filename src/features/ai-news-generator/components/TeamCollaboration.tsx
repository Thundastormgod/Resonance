// Team Collaboration Component
// Handles article assignment, approval workflow, and team communication

import React, { useState, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  MessageSquare,
  Check,
  X,
  Clock,
  Send,
  Edit3,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  User,
  Shield,
  Star,
  Bell,
  Filter,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// ============================================================
// TYPES
// ============================================================

export type TeamRole = 'admin' | 'editor' | 'writer' | 'reviewer';
export type ApprovalStatus = 'draft' | 'pending-review' | 'in-review' | 'approved' | 'rejected' | 'published';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: TeamRole;
  department?: string;
  status: 'online' | 'away' | 'offline';
  articlesAssigned: number;
  articlesCompleted: number;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: string;
  type: 'comment' | 'approval' | 'rejection' | 'assignment' | 'revision';
  resolved?: boolean;
  highlightStart?: number;
  highlightEnd?: number;
}

export interface ArticleAssignment {
  articleId: string;
  articleTitle: string;
  status: ApprovalStatus;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  comments: Comment[];
  revisionNumber: number;
}

interface TeamCollaborationProps {
  currentUserId: string;
  currentArticle?: {
    id: string;
    title: string;
    status: ApprovalStatus;
  };
  teamMembers?: TeamMember[];
  assignment?: ArticleAssignment;
  onAssign: (memberId: string, deadline?: string, priority?: ArticleAssignment['priority']) => void;
  onSubmitForReview: () => void;
  onApprove: (comment?: string) => void;
  onReject: (reason: string) => void;
  onAddComment: (comment: string, highlightRange?: { start: number; end: number }) => void;
  onResolveComment: (commentId: string) => void;
}

// ============================================================
// MOCK DATA (For demo - replace with actual API)
// ============================================================

const MOCK_TEAM: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@resonance.news',
    role: 'editor',
    department: 'News',
    status: 'online',
    articlesAssigned: 5,
    articlesCompleted: 42,
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael@resonance.news',
    role: 'writer',
    department: 'Technology',
    status: 'online',
    articlesAssigned: 3,
    articlesCompleted: 28,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily@resonance.news',
    role: 'reviewer',
    department: 'Editorial',
    status: 'away',
    articlesAssigned: 8,
    articlesCompleted: 156,
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david@resonance.news',
    role: 'writer',
    department: 'Business',
    status: 'offline',
    articlesAssigned: 2,
    articlesCompleted: 19,
  },
  {
    id: '5',
    name: 'Admin User',
    email: 'admin@resonance.news',
    role: 'admin',
    department: 'Management',
    status: 'online',
    articlesAssigned: 0,
    articlesCompleted: 0,
  },
];

// ============================================================
// HELPERS
// ============================================================

function getStatusColor(status: ApprovalStatus): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    case 'pending-review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'in-review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'published': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getStatusIcon(status: ApprovalStatus) {
  switch (status) {
    case 'draft': return <Edit3 className="h-4 w-4" />;
    case 'pending-review': return <Clock className="h-4 w-4" />;
    case 'in-review': return <Eye className="h-4 w-4" />;
    case 'approved': return <CheckCircle2 className="h-4 w-4" />;
    case 'rejected': return <XCircle className="h-4 w-4" />;
    case 'published': return <Send className="h-4 w-4" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
}

function getRoleColor(role: TeamRole): string {
  switch (role) {
    case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'editor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'writer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'reviewer': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority: ArticleAssignment['priority']): string {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamCollaboration({
  currentUserId,
  currentArticle,
  teamMembers = MOCK_TEAM,
  assignment,
  onAssign,
  onSubmitForReview,
  onApprove,
  onReject,
  onAddComment,
  onResolveComment,
}: TeamCollaborationProps) {
  // State
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [priority, setPriority] = useState<ArticleAssignment['priority']>('medium');
  const [newComment, setNewComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [filterRole, setFilterRole] = useState<TeamRole | 'all'>('all');

  // Current user
  const currentUser = useMemo(() => 
    teamMembers.find(m => m.id === currentUserId),
    [teamMembers, currentUserId]
  );

  // Filtered team
  const filteredTeam = useMemo(() => 
    filterRole === 'all' 
      ? teamMembers 
      : teamMembers.filter(m => m.role === filterRole),
    [teamMembers, filterRole]
  );

  // Can user approve/reject?
  const canApprove = useMemo(() => 
    currentUser?.role === 'admin' || currentUser?.role === 'editor' || currentUser?.role === 'reviewer',
    [currentUser]
  );

  // Handlers
  const handleAssign = useCallback(() => {
    if (selectedMember) {
      onAssign(selectedMember, deadline || undefined, priority);
      setShowAssignDialog(false);
      setSelectedMember('');
      setDeadline('');
      setPriority('medium');
    }
  }, [selectedMember, deadline, priority, onAssign]);

  const handleReject = useCallback(() => {
    if (rejectReason.trim()) {
      onReject(rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    }
  }, [rejectReason, onReject]);

  const handleAddComment = useCallback(() => {
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
  }, [newComment, onAddComment]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="font-semibold">Team Collaboration</h3>
        </div>
        {currentArticle && (
          <Badge className={getStatusColor(currentArticle.status)}>
            {getStatusIcon(currentArticle.status)}
            <span className="ml-1 capitalize">{currentArticle.status.replace('-', ' ')}</span>
          </Badge>
        )}
      </div>

      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="comments">
            Comments
            {assignment?.comments.filter(c => !c.resolved).length ? (
              <Badge variant="secondary" className="ml-1">
                {assignment.comments.filter(c => !c.resolved).length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="mt-4 space-y-4">
          {/* Current Assignment Info */}
          {assignment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignment.assignedTo && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assigned to</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(teamMembers.find(m => m.id === assignment.assignedTo)?.name || 'UN')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {teamMembers.find(m => m.id === assignment.assignedTo)?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                )}
                {assignment.deadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Deadline</span>
                    <span className="text-sm">{new Date(assignment.deadline).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <Badge className={getPriorityColor(assignment.priority)}>
                    {assignment.priority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Revision</span>
                  <span className="text-sm">#{assignment.revisionNumber}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workflow Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Writer Actions */}
              {(!assignment || assignment.status === 'draft' || assignment.status === 'rejected') && (
                <>
                  <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline">
                        <UserPlus className="h-4 w-4 mr-2" />
                        {assignment?.assignedTo ? 'Reassign' : 'Assign to Writer'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Article</DialogTitle>
                        <DialogDescription>
                          Select a team member and set the deadline
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Assign to</Label>
                          <Select value={selectedMember} onValueChange={setSelectedMember}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select team member" />
                            </SelectTrigger>
                            <SelectContent>
                              {teamMembers
                                .filter(m => m.role === 'writer' || m.role === 'editor')
                                .map(member => (
                                  <SelectItem key={member.id} value={member.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{member.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {member.articlesAssigned} assigned
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Deadline (optional)</Label>
                          <Input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select value={priority} onValueChange={(v) => setPriority(v as ArticleAssignment['priority'])}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAssign} disabled={!selectedMember}>
                          Assign
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button className="w-full" onClick={onSubmitForReview}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Review
                  </Button>
                </>
              )}

              {/* Reviewer Actions */}
              {assignment?.status === 'pending-review' && canApprove && (
                <>
                  <Button className="w-full" variant="default" onClick={() => onApprove()}>
                    <Check className="h-4 w-4 mr-2" />
                    Start Review
                  </Button>
                </>
              )}

              {assignment?.status === 'in-review' && canApprove && (
                <>
                  <Button className="w-full" variant="default" onClick={() => onApprove()}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  
                  <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="destructive">
                        <X className="h-4 w-4 mr-2" />
                        Request Revisions
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Revisions</DialogTitle>
                        <DialogDescription>
                          Explain what needs to be changed
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Describe the required changes..."
                          rows={4}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
                          Send Back for Revisions
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {/* Approved - ready to publish */}
              {assignment?.status === 'approved' && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="font-medium">Article Approved</p>
                  <p className="text-sm text-muted-foreground">Ready to publish</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Workflow Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {['draft', 'pending-review', 'in-review', 'approved', 'published'].map((status, index) => (
                  <React.Fragment key={status}>
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        assignment?.status === status 
                          ? 'bg-primary text-primary-foreground'
                          : ['draft', 'pending-review', 'in-review', 'approved', 'published']
                              .indexOf(assignment?.status || 'draft') > index
                            ? 'bg-green-500 text-white'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {getStatusIcon(status as ApprovalStatus)}
                      </div>
                      <span className="text-xs mt-1 text-center capitalize">
                        {status.replace('-', '\n')}
                      </span>
                    </div>
                    {index < 4 && (
                      <div className={`flex-1 h-0.5 mx-1 ${
                        ['draft', 'pending-review', 'in-review', 'approved', 'published']
                          .indexOf(assignment?.status || 'draft') > index
                          ? 'bg-green-500'
                          : 'bg-muted'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="mt-4 space-y-4">
          {/* Add Comment */}
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="flex-1"
            />
            <Button 
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Comments List */}
          <ScrollArea className="h-[300px]">
            {!assignment?.comments?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No comments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignment.comments.map((comment) => (
                  <Card key={comment.id} className={comment.resolved ? 'opacity-60' : ''}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.authorAvatar} />
                          <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(comment.timestamp)}
                            </span>
                            {comment.type !== 'comment' && (
                              <Badge variant="outline" className="text-xs">
                                {comment.type}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{comment.content}</p>
                          {!comment.resolved && comment.type === 'comment' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-6 text-xs"
                              onClick={() => onResolveComment(comment.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                          {comment.resolved && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-4 space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterRole} onValueChange={(v) => setFilterRole(v as TeamRole | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="writer">Writer</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team List */}
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {filteredTeam.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                          member.status === 'online' ? 'bg-green-500' :
                          member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {member.id === currentUserId && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge className={`${getRoleColor(member.role)} text-xs`}>
                            {member.role}
                          </Badge>
                          {member.department && <span>• {member.department}</span>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{member.articlesAssigned} assigned</div>
                        <div>{member.articlesCompleted} completed</div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedMember(member.id);
                            setShowAssignDialog(true);
                          }}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Article
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <User className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TeamCollaboration;
