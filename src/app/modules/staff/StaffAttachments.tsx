import { useEffect, useState, useCallback } from 'react';
import { useBranch } from '../../contexts/BranchContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Paperclip, Download, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { API_BASE } from '../../../api/ApiService';

type StaffOption = { id: number; name: string; email: string };

type StaffAttachmentWithStaff = {
  id: number;
  staffId: number;
  staffName: string;
  fileName: string;
  note?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt: string;
  url: string;
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function StaffAttachments() {
  const { selectedBranchId } = useBranch();
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [attachments, setAttachments] = useState<StaffAttachmentWithStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStaffId, setUploadStaffId] = useState<number | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadNote, setUploadNote] = useState('');

  const fetchStaffOptions = useCallback(async () => {
    if (selectedBranchId == null) {
      setStaffOptions([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set('branchId', String(selectedBranchId));
      params.set('page', '1');
      params.set('limit', '100');
      const res = await fetch(`${API_BASE}/staff?${params.toString()}`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !Array.isArray(data.data)) {
        setStaffOptions([]);
        return;
      }
      setStaffOptions(
        data.data.map((s: any) => ({
          id: s.id,
          name: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email,
          email: s.email,
        })),
      );
    } catch {
      setStaffOptions([]);
    }
  }, [selectedBranchId]);

  const fetchAttachments = useCallback(async () => {
    if (selectedBranchId == null) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('branchId', String(selectedBranchId));
      const res = await fetch(`${API_BASE}/staff/attachments?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !Array.isArray(data.data)) {
        setAttachments([]);
        return;
      }
      setAttachments(data.data);
    } catch {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchStaffOptions();
    fetchAttachments();
  }, [fetchStaffOptions, fetchAttachments]);

  const hasBranch = selectedBranchId != null;

  const handleDownloadStaffFiles = useCallback((files: StaffAttachmentWithStaff[]) => {
    files.forEach((att, i) => {
      setTimeout(() => {
        const url = att.url.startsWith('http') ? att.url : `${window.location.origin}${att.url}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = att.fileName || `attachment-${att.id}`;
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 200);
    });
    toast.success(`Downloading ${files.length} file${files.length === 1 ? '' : 's'}…`);
  }, []);

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50/60">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Paperclip className="w-6 h-6 text-purple-600" />
            Staff Attachments
          </h1>
          <p className="text-slate-500 mt-1">
            Store CNIC copies, contracts, certificates and other important documents for your team.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 text-xs md:text-sm">
            {attachments.length} file{attachments.length === 1 ? '' : 's'}
          </Badge>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => {
              setUploadStaffId(null);
              setUploadFiles([]);
              setUploadNote('');
              setUploadDialogOpen(true);
            }}
            disabled={!hasBranch || staffOptions.length === 0}
          >
            <Paperclip className="w-4 h-4" />
            Upload Attachment
          </Button>
        </div>
      </div>

      {!hasBranch && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 rounded-md">
          Select a branch from the header to view and manage staff attachments.
        </p>
      )}

      {hasBranch && (
        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base md:text-lg">All attachments</CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Keep staff documents organized and easy to find.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : attachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed bg-muted/30">
                <Paperclip className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">No attachments yet</p>
                <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
                  Upload contracts, ID copies or certificates for staff members using the Upload Attachment button.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const sorted = [...attachments].sort(
                        (a, b) => a.staffId - b.staffId || a.id - b.id
                      );
                      const groups = sorted.reduce(
                        (acc, att) => {
                          const last = acc[acc.length - 1];
                          if (last && last.staffId === att.staffId) {
                            last.files.push(att);
                            return acc;
                          }
                          acc.push({
                            staffId: att.staffId,
                            staffName: att.staffName,
                            files: [att],
                          });
                          return acc;
                        },
                        [] as { staffId: number; staffName: string; files: StaffAttachmentWithStaff[] }[]
                      );
                      return groups.map((group) => (
                        <TableRow key={group.staffId}>
                          <TableCell className="font-medium align-middle">
                            {group.staffName}
                          </TableCell>
                          <TableCell className="align-middle">
                            <ul className="list-disc list-inside text-sm space-y-0.5 max-h-32 overflow-y-auto">
                              {group.files.map((att) => (
                                <li key={att.id} className="truncate max-w-[280px]" title={att.fileName}>
                                  {att.fileName || '—'}
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Download all"
                                onClick={() => handleDownloadStaffFiles(group.files)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete all"
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      `Delete all ${group.files.length} attachment${group.files.length === 1 ? '' : 's'} for ${group.staffName}?`
                                    )
                                  )
                                    return;
                                  let failed = 0;
                                  for (const att of group.files) {
                                    try {
                                      const res = await fetch(
                                        `${API_BASE}/staff/${att.staffId}/attachments/${att.id}`,
                                        { method: 'DELETE', headers: getAuthHeaders() }
                                      );
                                      const data = await res.json().catch(() => ({}));
                                      if (!res.ok || !data?.success) failed++;
                                    } catch {
                                      failed++;
                                    }
                                  }
                                  if (failed > 0) {
                                    toast.error(`Failed to delete ${failed} attachment${failed === 1 ? '' : 's'}`);
                                  } else {
                                    toast.success('All attachments deleted');
                                  }
                                  setAttachments((prev) =>
                                    prev.filter((a) => a.staffId !== group.staffId)
                                  );
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          if (!open && !uploading) {
            setUploadDialogOpen(false);
            setUploadStaffId(null);
            setUploadFiles([]);
            setUploadNote('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Staff Attachment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff</Label>
              <Select
                value={uploadStaffId != null ? String(uploadStaffId) : ''}
                onValueChange={(v) => setUploadStaffId(v ? parseInt(v, 10) : null)}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-attachment-file">Files</Label>
              <Input
                id="staff-attachment-file"
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setUploadFiles(files);
                }}
                disabled={uploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                You can select multiple files at once (e.g. CNIC, contract, certificates).
              </p>
              {uploadFiles.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-2 space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    {uploadFiles.length} file{uploadFiles.length === 1 ? '' : 's'} selected
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside max-h-24 overflow-y-auto">
                    {uploadFiles.map((f, i) => (
                      <li key={i} className="truncate" title={f.name}>
                        {f.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-attachment-note">Note (optional)</Label>
              <Input
                id="staff-attachment-note"
                type="text"
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                disabled={uploading}
                placeholder="e.g. CNIC copy, contract, certificate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (uploading) return;
                setUploadDialogOpen(false);
                setUploadStaffId(null);
                setUploadFiles([]);
                setUploadNote('');
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={uploading || uploadFiles.length === 0 || uploadStaffId == null}
              onClick={async () => {
                if (!uploadFiles.length || uploadStaffId == null) return;
                try {
                  setUploading(true);
                  const formData = new FormData();
                  uploadFiles.forEach((file) => formData.append('files', file));
                  if (uploadNote.trim()) formData.append('note', uploadNote.trim());
                  const res = await fetch(`${API_BASE}/staff/${uploadStaffId}/attachments`, {
                    method: 'POST',
                    headers: {
                      Authorization: getAuthHeaders().Authorization as string,
                    },
                    body: formData,
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok || !data?.success) {
                    toast.error(data.message || 'Failed to upload attachment');
                    return;
                  }
                  toast.success('Attachment uploaded');
                  setUploadFiles([]);
                  setUploadNote('');
                  setUploadStaffId(null);
                  setUploadDialogOpen(false);
                  fetchAttachments();
                } catch {
                  toast.error('Failed to upload attachment');
                } finally {
                  setUploading(false);
                }
              }}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

