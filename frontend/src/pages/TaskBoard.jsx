import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Box, Typography, Paper, Grid, Button, Card, Avatar, 
  Chip, Tooltip, Container, Stack, Autocomplete, TextField, 
  useTheme, alpha, InputAdornment // <-- Добавлен пропущенный импорт
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';

const COLUMNS = {
  TODO: { id: 'TODO', title: 'К выполнению', color: '#888' },
  IN_PROGRESS: { id: 'IN_PROGRESS', title: 'В работе', color: '#af94f2' },
  REVIEW: { id: 'REVIEW', title: 'Ревью', color: '#63b3ed' },
  DONE: { id: 'DONE', title: 'Готово', color: '#68d391' }
};

export default function TaskBoard() {
  const { user } = useAuth();
  const theme = useTheme();
  const ACCENT_COLOR = theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';

  const [tasks, setTasks] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  
  // Состояния для фильтрации
  const [teamMembers, setTeamMembers] = useState([]);
  const [filterAssignee, setFilterAssignee] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const isAdminPlus = user?.role >= 3;

  const getImageUrl = (path) => {
    if (!path) return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `http://localhost:8080${path.startsWith('/') ? path : '/' + path}`;
  };

  // 1. Инициализация и загрузка команд
  useEffect(() => {
    if (user?.team_id) setSelectedTeamId(user.team_id);

    if (isAdminPlus) {
      const fetchTeams = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8080/api/teamsIn', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableTeams(data || []);
          if (!user?.team_id && data.length > 0) setSelectedTeamId(data[0].id);
        }
      };
      fetchTeams();
    }
  }, [user, isAdminPlus]);

  // 2. Загрузка задач и УЧАСТНИКОВ при смене команды
  const fetchTasks = async () => {
    if (!selectedTeamId) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Загружаем задачи и детали команды параллельно
      const [tasksRes, teamRes] = await Promise.all([
        fetch(`http://localhost:8080/api/tasks?team_id=${selectedTeamId}`, { headers }),
        fetch(`http://localhost:8080/api/teams/${selectedTeamId}`, { headers })
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(Array.isArray(tasksData) ? tasksData : []);
      }
      
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeamMembers(teamData.members || []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchTasks();
    setFilterAssignee(null); // Сброс фильтра при смене команды
  }, [selectedTeamId]);

  // 3. Логика фильтрации
  const getFilteredTasks = () => {
    if (!filterAssignee) return tasks;
    return tasks.filter(task => Number(task.assignee_id) === Number(filterAssignee.id));
  };

  const displayTasks = getFilteredTasks();

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
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <Typography color="text.secondary">Вступите в команду для работы с задачами.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Шапка с фильтрами */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h5" fontWeight="800" sx={{ letterSpacing: '-0.02em', mr: 1 }}>Задачи</Typography>
            
            {isAdminPlus && (
                <Autocomplete
                    size="small"
                    sx={{ width: 180 }}
                    options={availableTeams}
                    getOptionLabel={(o) => o.name || ""}
                    value={availableTeams.find(t => t.id === selectedTeamId) || null}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    onChange={(_, v) => { if (v) setSelectedTeamId(v.id); }}
                    renderInput={(params) => <TextField {...params} label="Команда" />}
                />
            )}

            <Autocomplete
                size="small"
                sx={{ width: 220 }}
                options={teamMembers}
                getOptionLabel={(o) => o.full_name || ""}
                value={filterAssignee}
                onChange={(_, v) => setFilterAssignee(v)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Исполнитель" 
                    placeholder="Все участники" 
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PersonOutlineIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      )
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box key={key} component="li" {...optionProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
                       <Avatar src={getImageUrl(option.avatar_url)} sx={{ width: 24, height: 24, fontSize: 11 }}>
                        {option.full_name[0]}
                       </Avatar>
                       <Typography variant="body2">{option.full_name}</Typography>
                    </Box>
                  );
                }}
            />
        </Stack>

        {user?.role >= 2 && (
          <Button 
            variant="contained" 
            disableElevation
            startIcon={<AddCircleOutlineIcon />} 
            onClick={() => { setSelectedTask(null); setIsModalOpen(true); }}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, bgcolor: ACCENT_COLOR }}
          >
            Создать задачу
          </Button>
        )}
      </Box>

      {/* Доска */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          {Object.values(COLUMNS).map(col => (
            <Grid key={col.id} size={{ xs: 12, sm: 6, md: 3 }} sx={{ height: '100%' }}>
              <Box sx={{ 
                display: 'flex', flexDirection: 'column', height: '100%', 
                bgcolor: isDark ? alpha(theme.palette.background.paper, 0.5) : '#fafafa', 
                borderRadius: '12px', border: '1px solid', borderColor: 'divider' 
              }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col.color }} />
                  <Typography variant="caption" fontWeight="800" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {col.title}
                  </Typography>
                  <Typography variant="caption" sx={{ ml: 'auto', fontWeight: 700, color: 'text.disabled' }}>
                    {displayTasks.filter(t => t.status === col.id).length}
                  </Typography>
                </Box>

                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <Box 
                      {...provided.droppableProps} 
                      ref={provided.innerRef} 
                      sx={{ 
                        flex: 1, overflowY: 'auto', px: 1.5, pb: 2,
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-thumb': { background: 'transparent', borderRadius: '10px' },
                        '&:hover::-webkit-scrollbar-thumb': { background: theme.palette.divider }
                      }}
                    >
                      {displayTasks.filter(t => t.status === col.id).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => { setSelectedTask(task); setIsModalOpen(true); }}
                              elevation={0}
                              sx={{ 
                                mb: 1.5, p: 2, borderRadius: '8px', border: '1px solid', 
                                borderColor: 'divider', bgcolor: 'background.paper',
                                transition: '0.2s',
                                '&:hover': { borderColor: ACCENT_COLOR, transform: 'translateY(-2px)' }
                              }}
                            >
                              <Typography variant="body2" fontWeight="600" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                                {task.title}
                              </Typography>
                              
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
                                  <CalendarTodayOutlinedIcon sx={{ fontSize: 13 }} />
                                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '--'}
                                  </Typography>
                                </Box>
                                
                                <Tooltip title={task.assignee?.full_name || "Не назначено"}>
                                  <Avatar 
                                    src={getImageUrl(task.assignee?.avatar_url)} 
                                    sx={{ 
                                      width: 24, height: 24, fontSize: 10, 
                                      border: '1px solid', borderColor: 'divider',
                                      bgcolor: alpha(ACCENT_COLOR, 0.1), color: ACCENT_COLOR 
                                    }}
                                  >
                                    {task.assignee?.full_name?.charAt(0)}
                                  </Avatar>
                                </Tooltip>
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