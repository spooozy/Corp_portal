import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Box, Typography, Paper, Grid, Button, Card, Avatar, 
  Chip, Tooltip, Container, Stack, Autocomplete, TextField 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';

const COLUMNS = {
  TODO: { id: 'TODO', title: 'Задачи', color: '#666' },
  IN_PROGRESS: { id: 'IN_PROGRESS', title: 'В работе', color: '#3182ce' },
  REVIEW: { id: 'REVIEW', title: 'Ревью', color: '#d69e2e' },
  DONE: { id: 'DONE', title: 'Выполнено', color: '#38a169' }
};

export default function TaskBoard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const isAdminPlus = user?.role >= 3;

  useEffect(() => {
    if (user?.team_id) {
        setSelectedTeamId(user.team_id);
    }

    if (isAdminPlus) {
      const fetchTeams = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8080/api/teamsIn', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableTeams(data || []);
          if (!user?.team_id && data.length > 0) {
            setSelectedTeamId(data[0].id);
          }
        }
      };
      fetchTeams();
    }
  }, [user, isAdminPlus]);

  const getImageUrl = (path) => {
    if (!path) return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `http://localhost:8080${path.startsWith('/') ? path : '/' + path}`;
  };

  const fetchTasks = async () => {
    if (!selectedTeamId) return;
    try {
      const res = await fetch(`http://localhost:8080/api/tasks?team_id=${selectedTeamId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) { setTasks([]); }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedTeamId]);

  const onDragEnd = async (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const taskIndex = tasks.findIndex(t => t.id.toString() === draggableId);
    if (tasks[taskIndex].status === destination.droppableId) return;

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].status = destination.droppableId;
    setTasks(updatedTasks);

    await fetch(`http://localhost:8080/api/tasks/${draggableId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({ status: destination.droppableId })
    });
  };

  if (!selectedTeamId && !isAdminPlus) {
    return <Container sx={{ py: 10, textAlign: 'center' }}>
      <Typography variant="h6" color="text.secondary">Вступите в команду, чтобы пользоваться доской задач.</Typography>
    </Container>;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography variant="h5" fontWeight="700">Доска задач</Typography>
            
            {isAdminPlus && (
                <Autocomplete
                    size="small"
                    sx={{ width: 250 }}
                    options={availableTeams}
                    getOptionLabel={(option) => option.name || ""}
                    value={availableTeams.find(t => t.id === selectedTeamId) || null}
                    onChange={(_, newValue) => {
                        if (newValue) setSelectedTeamId(newValue.id);
                    }}
                    renderInput={(params) => <TextField {...params} label="Просмотр команды" variant="outlined" />}
                />
            )}
        </Box>

        {(isAdminPlus || user?.role >= 1) && (
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={() => { setSelectedTask(null); setIsModalOpen(true); }}
            sx={{ borderRadius: '6px', textTransform: 'none', borderColor: '#e0e0e0', color: '#444' }}
          >
            Новая задача
          </Button>
        )}
      </Box>

      <DragDropContext onDragEnd={onDragEnd}>
        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          {Object.values(COLUMNS).map(col => (
            <Grid key={col.id} size={{ xs: 12, sm: 6, md: 3 }} sx={{ height: '100%' }}>
              <Box sx={{ 
                display: 'flex', flexDirection: 'column', height: '100%', 
                bgcolor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' 
              }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col.color }} />
                  <Typography variant="subtitle2" fontWeight="700" color="#555">{col.title.toUpperCase()}</Typography>
                  <Typography variant="caption" sx={{ ml: 'auto', bgcolor: '#eee', px: 1, borderRadius: 1 }}>
                    {tasks.filter(t => t.status === col.id).length}
                  </Typography>
                </Box>

                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <Box {...provided.droppableProps} ref={provided.innerRef} sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2 }}>
                      {tasks.filter(t => t.status === col.id).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => { setSelectedTask(task); setIsModalOpen(true); }}
                              elevation={0}
                              sx={{ 
                                mb: 1.5, p: 2, borderRadius: '6px', border: '1px solid #e0e0e0',
                                bgcolor: '#fff', transition: '0.2s', '&:hover': { borderColor: '#999' }
                              }}
                            >
                              <Typography variant="body2" fontWeight="600" sx={{ mb: 1 }}>{task.title}</Typography>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#888' }}>
                                  <CalendarTodayIcon sx={{ fontSize: 12 }} />
                                  <Typography sx={{ fontSize: '0.7rem' }}>
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '--'}
                                  </Typography>
                                </Box>
                                <Avatar 
                                  src={getImageUrl(task.assignee?.avatar_url)} 
                                  sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#eee', color: '#666', border: '1px solid #ddd' }}
                                >
                                  {task.assignee?.full_name?.charAt(0)}
                                </Avatar>
                              </Stack>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>

      <TaskModal 
        open={isModalOpen} onClose={() => setIsModalOpen(false)} 
        task={selectedTask} onSuccess={fetchTasks} teamId={selectedTeamId}
      />
    </Container>
  );
}