// FILE: src/components/dashboard/TodoList.js
"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Lucide Icons
import {
  Plus, Check, Pencil, Trash2, AlertTriangle, Edit3, X
} from 'lucide-react';

// Services
import { todoService } from '@/services/api'; // ✅ Pastikan path ini benar

// --- Motion Components ---
const MotionListItem = motion.div;

// --- Main Component ---
const TodoList = ({ userRole }) => {
  const queryClient = useQueryClient();
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteId, setDeleteId] = useState(null); // ✅ State untuk ID todo yang akan dihapus

  // ✅ React Query: Fetch Todos
  const { data: todos = [], isLoading, isError, error } = useQuery({
    queryKey: ['todos', userRole],
    queryFn: async () => {
      const response = await todoService.getTodosByRole(userRole);
      return response.data || [];
    },
    enabled: !!userRole,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 menit
  });

  // Hitung statistik
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.completed).length;
  const progressPercentage = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  // ✅ Mutations
  const addTodoMutation = useMutation({
    mutationFn: async (todoText) => {
      const response = await todoService.addTodo(userRole, { text: todoText, completed: false });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', userRole] });
      setNewTodo('');
      toast({
        title: "Todo added successfully",
        description: "Your new task has been added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add todo",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const updateTodoStatusMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      const response = await todoService.updateTodoStatus(id, completed);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', userRole] });
      toast({
        title: "Todo updated",
        description: "Task status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update todo",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id) => {
      const response = await todoService.deleteTodo(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', userRole] });
      toast({
        title: "Todo deleted",
        description: "The task has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete todo",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateTodoTextMutation = useMutation({
    mutationFn: async ({ id, text }) => {
      const response = await todoService.updateTodoText(id, text);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', userRole] });
      setEditingId(null);
      setEditText('');
      toast({
        title: "Todo updated",
        description: "The task text has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update todo",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  // --- Handlers ---
  const handleAddTodo = () => {
    if (newTodo.trim()) {
      addTodoMutation.mutate(newTodo);
    } else {
      toast({
        title: "Empty todo",
        description: "Please enter a todo item.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = (id, completed) => {
    updateTodoStatusMutation.mutate({ id, completed });
  };

  const handleDelete = (id) => {
    setDeleteId(id); // ✅ Set ID untuk dialog konfirmasi
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteTodoMutation.mutate(deleteId);
      setDeleteId(null); // ✅ Reset setelah mutasi
    }
  };

  const cancelDelete = () => {
    setDeleteId(null); // ✅ Batalkan penghapusan
  };

  const startEditing = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const handleUpdateText = (id) => {
    if (editText.trim()) {
      updateTodoTextMutation.mutate({ id, text: editText });
    } else {
      toast({
        title: "Empty todo",
        description: "Todo text cannot be empty.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e, id) => {
    if (e.key === 'Enter') {
      if (editingId) {
        handleUpdateText(id);
      } else {
        handleAddTodo();
      }
    }
    if (e.key === 'Escape') {
      setEditingId(null);
      setEditText('');
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardContent>
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Todos</AlertTitle>
            <AlertDescription>
              {error?.message || 'Failed to load todo items. Please try again later.'}
            </AlertDescription>
            <Button
              variant="destructive"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['todos', userRole] })}
              className="mt-4"
            >
              Retry
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full border-border">
        <CardHeader className="pb-4 pt-4 bg-muted/50">
          <div className="flex justify-between items-center flex-wrap">
            <CardTitle className="text-lg font-semibold text-primary">
              Task Manager
            </CardTitle>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 capitalize">
              {userRole?.replace(/_/g, ' ') || 'User'}
            </span>
          </div>

          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Progress: {completedTodos}/{totalTodos} completed
            </p>
            <Progress
              value={progressPercentage}
              className={`w-full h-2 ${progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <div className="relative flex-1">
              <Input
                placeholder="Add a new task..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTodo();
                }}
                className="pl-10"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <Button
              onClick={handleAddTodo}
              disabled={addTodoMutation.isPending}
              className="flex items-center gap-2"
            >
              {addTodoMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Task
                </>
              )}
            </Button>
          </div>

          {totalTodos > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {totalTodos} {totalTodos === 1 ? 'task' : 'tasks'} in list
              </p>

              <div className="space-y-3">
                <AnimatePresence>
                  {todos.map((todo) => (
                    <MotionListItem
                      key={todo.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      layout
                      className="overflow-hidden"
                    >
                      <Card className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            {editingId === todo.id ? (
                              <div className="flex items-center gap-2 flex-1 mr-2">
                                <Input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateText(todo.id);
                                    if (e.key === 'Escape') {
                                      setEditingId(null);
                                      setEditText('');
                                    }
                                  }}
                                  autoFocus
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleUpdateText(todo.id)}
                                  className="flex items-center gap-2"
                                >
                                  <Check className="w-4 h-4" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center space-x-3 flex-1">
                                  <Checkbox
                                    checked={todo.completed}
                                    onCheckedChange={(checked) => handleUpdateStatus(todo.id, checked)}
                                    id={`todo-${todo.id}`}
                                  />
                                  <label
                                    htmlFor={`todo-${todo.id}`}
                                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                                  >
                                    {todo.text}
                                  </label>
                                </div>

                                <div className="flex items-center space-x-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEditing(todo)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Pencil className="w-4 h-4" />
                                        <span className="sr-only">Edit</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit task</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(todo.id)}
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="sr-only">Delete</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Delete task</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </MotionListItem>
                  ))}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-md border-border">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Tasks Yet</h3>
              <p className="text-sm text-muted-foreground">
                Add your first task using the form above to get started!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ AlertDialog untuk Konfirmasi Hapus */}
      <AlertDialog open={!!deleteId} onOpenChange={(isOpen) => !isOpen && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default TodoList;