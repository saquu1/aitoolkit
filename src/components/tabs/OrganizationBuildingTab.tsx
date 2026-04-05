'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/hooks/useTheme'
import {
  Building2,
  Layers,
  DoorOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronRight,
  MapPin,
  Hash,
  Users,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Building,
  Home,
  OfficeBuilding
} from 'lucide-react'

// Types
interface Building {
  id: string
  name: string
  description?: string | null
  code?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  postalCode?: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

interface Floor {
  id: string
  buildingId: string
  name: string
  description?: string | null
  code?: string | null
  floorNumber?: number | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

interface Room {
  id: string
  floorId: string
  name: string
  description?: string | null
  code?: string | null
  roomNumber?: string | null
  capacity?: number | null
  roomType?: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  floor?: {
    id: string
    name: string
    building?: {
      id: string
      name: string
    }
  }
}

interface Stats {
  total: {
    buildings: number
    floors: number
    rooms: number
  }
  active: {
    buildings: number
    floors: number
    rooms: number
  }
}

// Room types for dropdown
const ROOM_TYPES = [
  'Office',
  'Meeting Room',
  'Conference Room',
  'Break Room',
  'Storage',
  'Server Room',
  'Reception',
  'Restroom',
  'Kitchen',
  'Laboratory',
  'Classroom',
  'Auditorium',
  'Other'
]

// Helper function for alpha colors
const alpha = (color: string, opacity: number) =>
  `color-mix(in srgb, ${color} ${opacity}%, transparent)`

export function OrganizationBuildingTab() {
  const { colors } = useTheme()

  // State for data
  const [buildings, setBuildings] = useState<Building[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // State for selection
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)

  // State for search
  const [buildingSearch, setBuildingSearch] = useState('')
  const [floorSearch, setFloorSearch] = useState('')
  const [roomSearch, setRoomSearch] = useState('')

  // State for modals
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false)
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false)
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  // State for delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'building' | 'floor' | 'room'
    id: string
    name: string
  } | null>(null)

  // State for saving
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    description: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    isActive: true
  })

  const [floorForm, setFloorForm] = useState({
    name: '',
    description: '',
    code: '',
    floorNumber: '',
    isActive: true
  })

  const [roomForm, setRoomForm] = useState({
    name: '',
    description: '',
    code: '',
    roomNumber: '',
    capacity: '',
    roomType: '',
    isActive: true
  })

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [buildingsRes, floorsRes, roomsRes, statsRes] = await Promise.all([
        fetch('/api/organization-building?entity=buildings'),
        fetch('/api/organization-building?entity=floors'),
        fetch('/api/organization-building?entity=rooms'),
        fetch('/api/organization-building?entity=stats')
      ])

      if (buildingsRes.ok) {
        const data = await buildingsRes.json()
        setBuildings(data.buildings || [])
      }

      if (floorsRes.ok) {
        const data = await floorsRes.json()
        setFloors(data.floors || [])
      }

      if (roomsRes.ok) {
        const data = await roomsRes.json()
        setRooms(data.rooms || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter functions
  const filteredBuildings = buildings.filter(b =>
    b.name.toLowerCase().includes(buildingSearch.toLowerCase()) ||
    (b.code?.toLowerCase().includes(buildingSearch.toLowerCase())) ||
    (b.city?.toLowerCase().includes(buildingSearch.toLowerCase()))
  )

  const filteredFloors = floors.filter(f => {
    if (!selectedBuilding || f.buildingId !== selectedBuilding.id) return false
    return f.name.toLowerCase().includes(floorSearch.toLowerCase()) ||
      (f.code?.toLowerCase().includes(floorSearch.toLowerCase()))
  })

  const filteredRooms = rooms.filter(r => {
    if (!selectedFloor || r.floorId !== selectedFloor.id) return false
    return r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
      (r.code?.toLowerCase().includes(roomSearch.toLowerCase())) ||
      (r.roomNumber?.toLowerCase().includes(roomSearch.toLowerCase()))
  })

  // Get floor count for building
  const getFloorCount = (buildingId: string) => {
    return floors.filter(f => f.buildingId === buildingId).length
  }

  // Get room count for floor
  const getRoomCount = (floorId: string) => {
    return rooms.filter(r => r.floorId === floorId).length
  }

  // Building CRUD
  const openBuildingModal = (building?: Building) => {
    if (building) {
      setEditingBuilding(building)
      setBuildingForm({
        name: building.name,
        description: building.description || '',
        code: building.code || '',
        address: building.address || '',
        city: building.city || '',
        state: building.state || '',
        country: building.country || '',
        postalCode: building.postalCode || '',
        isActive: building.isActive
      })
    } else {
      setEditingBuilding(null)
      setBuildingForm({
        name: '',
        description: '',
        code: '',
        address: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        isActive: true
      })
    }
    setIsBuildingModalOpen(true)
  }

  const saveBuilding = async () => {
    if (!buildingForm.name.trim()) return
    setIsSaving(true)
    try {
      const url = editingBuilding
        ? `/api/organization-building?entity=buildings&id=${editingBuilding.id}`
        : '/api/organization-building?entity=buildings'
      const method = editingBuilding ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildingForm)
      })

      if (res.ok) {
        setIsBuildingModalOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to save building:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteBuilding = async (id: string) => {
    try {
      const res = await fetch(`/api/organization-building?entity=buildings&id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setDeleteConfirm(null)
        if (selectedBuilding?.id === id) {
          setSelectedBuilding(null)
          setSelectedFloor(null)
        }
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete building')
      }
    } catch (error) {
      console.error('Failed to delete building:', error)
    }
  }

  // Floor CRUD
  const openFloorModal = (floor?: Floor) => {
    if (!selectedBuilding && !floor) return
    if (floor) {
      setEditingFloor(floor)
      setFloorForm({
        name: floor.name,
        description: floor.description || '',
        code: floor.code || '',
        floorNumber: floor.floorNumber?.toString() || '',
        isActive: floor.isActive
      })
    } else {
      setEditingFloor(null)
      setFloorForm({
        name: '',
        description: '',
        code: '',
        floorNumber: '',
        isActive: true
      })
    }
    setIsFloorModalOpen(true)
  }

  const saveFloor = async () => {
    if (!floorForm.name.trim() || !selectedBuilding) return
    setIsSaving(true)
    try {
      const url = editingFloor
        ? `/api/organization-building?entity=floors&id=${editingFloor.id}`
        : '/api/organization-building?entity=floors'
      const method = editingFloor ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...floorForm,
          floorNumber: floorForm.floorNumber ? parseInt(floorForm.floorNumber) : null,
          buildingId: selectedBuilding.id
        })
      })

      if (res.ok) {
        setIsFloorModalOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to save floor:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteFloor = async (id: string) => {
    try {
      const res = await fetch(`/api/organization-building?entity=floors&id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setDeleteConfirm(null)
        if (selectedFloor?.id === id) {
          setSelectedFloor(null)
        }
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete floor')
      }
    } catch (error) {
      console.error('Failed to delete floor:', error)
    }
  }

  // Room CRUD
  const openRoomModal = (room?: Room) => {
    if (!selectedFloor && !room) return
    if (room) {
      setEditingRoom(room)
      setRoomForm({
        name: room.name,
        description: room.description || '',
        code: room.code || '',
        roomNumber: room.roomNumber || '',
        capacity: room.capacity?.toString() || '',
        roomType: room.roomType || '',
        isActive: room.isActive
      })
    } else {
      setEditingRoom(null)
      setRoomForm({
        name: '',
        description: '',
        code: '',
        roomNumber: '',
        capacity: '',
        roomType: '',
        isActive: true
      })
    }
    setIsRoomModalOpen(true)
  }

  const saveRoom = async () => {
    if (!roomForm.name.trim() || !selectedFloor) return
    setIsSaving(true)
    try {
      const url = editingRoom
        ? `/api/organization-building?entity=rooms&id=${editingRoom.id}`
        : '/api/organization-building?entity=rooms'
      const method = editingRoom ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...roomForm,
          capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
          floorId: selectedFloor.id
        })
      })

      if (res.ok) {
        setIsRoomModalOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to save room:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteRoom = async (id: string) => {
    try {
      const res = await fetch(`/api/organization-building?entity=rooms&id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setDeleteConfirm(null)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        <span className="ml-3" style={{ color: colors.textMuted }}>Loading organization structure...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Organization Structure</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Manage buildings, floors, and rooms in a 3-level hierarchy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            style={{ borderColor: colors.border, color: colors.textSecondary }}
            onClick={fetchData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Building2 className="w-6 h-6 mx-auto mb-2" style={{ color: colors.primary }} />
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.total.buildings}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Buildings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Layers className="w-6 h-6 mx-auto mb-2" style={{ color: colors.accent }} />
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.total.floors}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Floors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DoorOpen className="w-6 h-6 mx-auto mb-2" style={{ color: colors.success }} />
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.total.rooms}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Rooms</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: colors.success }} />
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.active.buildings}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Active Buildings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: colors.accent }} />
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.active.floors}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Active Floors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: colors.primary }} />
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.active.rooms}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Active Rooms</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Buildings Column */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2" style={{ color: colors.text }}>
                <Building2 className="w-5 h-5" style={{ color: colors.primary }} />
                Buildings
              </CardTitle>
              <Button
                size="sm"
                style={{ backgroundColor: colors.primary, color: '#ffffff' }}
                onClick={() => openBuildingModal()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
              <Input
                value={buildingSearch}
                onChange={(e) => setBuildingSearch(e.target.value)}
                placeholder="Search buildings..."
                className="pl-9"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {filteredBuildings.length === 0 ? (
                <div className="p-8 text-center" style={{ color: colors.textMuted }}>
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No buildings found</p>
                  <p className="text-xs mt-1">Click "Add" to create your first building</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: colors.border }}>
                  {filteredBuildings.map((building) => (
                    <div
                      key={building.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedBuilding?.id === building.id ? 'border-l-2' : ''
                      }`}
                      style={{
                        backgroundColor: selectedBuilding?.id === building.id
                          ? alpha(colors.primary, 10)
                          : 'transparent',
                        borderLeftColor: selectedBuilding?.id === building.id
                          ? colors.primary
                          : 'transparent',
                      }}
                      onClick={() => {
                        setSelectedBuilding(building)
                        setSelectedFloor(null)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate" style={{ color: colors.text }}>
                              {building.name}
                            </span>
                            {building.isActive ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: colors.success }} />
                            ) : (
                              <XCircle className="w-4 h-4 shrink-0" style={{ color: colors.error }} />
                            )}
                          </div>
                          {building.code && (
                            <span className="text-xs" style={{ color: colors.textMuted }}>
                              Code: {building.code}
                            </span>
                          )}
                          {building.city && (
                            <div className="flex items-center gap-1 text-xs mt-1" style={{ color: colors.textMuted }}>
                              <MapPin className="w-3 h-3" />
                              {building.city}{building.state ? `, ${building.state}` : ''}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs mt-1" style={{ color: colors.textMuted }}>
                            <Layers className="w-3 h-3" />
                            {getFloorCount(building.id)} floors
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            style={{ color: colors.textMuted }}
                            onClick={(e) => {
                              e.stopPropagation()
                              openBuildingModal(building)
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            style={{ color: colors.error }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirm({ type: 'building', id: building.id, name: building.name })
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Floors Column */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2" style={{ color: colors.text }}>
                <Layers className="w-5 h-5" style={{ color: colors.accent }} />
                Floors
              </CardTitle>
              <Button
                size="sm"
                style={{ backgroundColor: colors.primary, color: '#ffffff' }}
                onClick={() => openFloorModal()}
                disabled={!selectedBuilding}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            {selectedBuilding && (
              <div className="mt-2 text-sm" style={{ color: colors.textMuted }}>
                <ChevronRight className="w-4 h-4 inline mr-1" />
                {selectedBuilding.name}
              </div>
            )}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
              <Input
                value={floorSearch}
                onChange={(e) => setFloorSearch(e.target.value)}
                placeholder="Search floors..."
                className="pl-9"
                disabled={!selectedBuilding}
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {!selectedBuilding ? (
                <div className="p-8 text-center" style={{ color: colors.textMuted }}>
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a building</p>
                  <p className="text-xs mt-1">Choose a building from the left panel</p>
                </div>
              ) : filteredFloors.length === 0 ? (
                <div className="p-8 text-center" style={{ color: colors.textMuted }}>
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No floors found</p>
                  <p className="text-xs mt-1">Click "Add" to create a floor</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: colors.border }}>
                  {filteredFloors.map((floor) => (
                    <div
                      key={floor.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedFloor?.id === floor.id ? 'border-l-2' : ''
                      }`}
                      style={{
                        backgroundColor: selectedFloor?.id === floor.id
                          ? alpha(colors.accent, 10)
                          : 'transparent',
                        borderLeftColor: selectedFloor?.id === floor.id
                          ? colors.accent
                          : 'transparent',
                      }}
                      onClick={() => setSelectedFloor(floor)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate" style={{ color: colors.text }}>
                              {floor.name}
                            </span>
                            {floor.isActive ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: colors.success }} />
                            ) : (
                              <XCircle className="w-4 h-4 shrink-0" style={{ color: colors.error }} />
                            )}
                          </div>
                          {floor.code && (
                            <span className="text-xs" style={{ color: colors.textMuted }}>
                              Code: {floor.code}
                            </span>
                          )}
                          {floor.floorNumber !== null && floor.floorNumber !== undefined && (
                            <div className="flex items-center gap-1 text-xs mt-1" style={{ color: colors.textMuted }}>
                              <Hash className="w-3 h-3" />
                              Floor {floor.floorNumber}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs mt-1" style={{ color: colors.textMuted }}>
                            <DoorOpen className="w-3 h-3" />
                            {getRoomCount(floor.id)} rooms
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            style={{ color: colors.textMuted }}
                            onClick={(e) => {
                              e.stopPropagation()
                              openFloorModal(floor)
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            style={{ color: colors.error }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirm({ type: 'floor', id: floor.id, name: floor.name })
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rooms Column */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2" style={{ color: colors.text }}>
                <DoorOpen className="w-5 h-5" style={{ color: colors.success }} />
                Rooms
              </CardTitle>
              <Button
                size="sm"
                style={{ backgroundColor: colors.primary, color: '#ffffff' }}
                onClick={() => openRoomModal()}
                disabled={!selectedFloor}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            {selectedFloor && selectedBuilding && (
              <div className="mt-2 text-sm" style={{ color: colors.textMuted }}>
                <ChevronRight className="w-4 h-4 inline mr-1" />
                {selectedBuilding.name} / {selectedFloor.name}
              </div>
            )}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
              <Input
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search rooms..."
                className="pl-9"
                disabled={!selectedFloor}
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {!selectedFloor ? (
                <div className="p-8 text-center" style={{ color: colors.textMuted }}>
                  <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a floor</p>
                  <p className="text-xs mt-1">Choose a floor from the middle panel</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="p-8 text-center" style={{ color: colors.textMuted }}>
                  <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No rooms found</p>
                  <p className="text-xs mt-1">Click "Add" to create a room</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: colors.border }}>
                  {filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-4 transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate" style={{ color: colors.text }}>
                              {room.name}
                            </span>
                            {room.isActive ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: colors.success }} />
                            ) : (
                              <XCircle className="w-4 h-4 shrink-0" style={{ color: colors.error }} />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {room.roomNumber && (
                              <span className="text-xs" style={{ color: colors.textMuted }}>
                                #{room.roomNumber}
                              </span>
                            )}
                            {room.roomType && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: colors.border, color: colors.textMuted }}
                              >
                                {room.roomType}
                              </Badge>
                            )}
                          </div>
                          {room.capacity && (
                            <div className="flex items-center gap-1 text-xs mt-1" style={{ color: colors.textMuted }}>
                              <Users className="w-3 h-3" />
                              Capacity: {room.capacity}
                            </div>
                          )}
                          {room.description && (
                            <p className="text-xs mt-1 truncate" style={{ color: colors.textMuted }}>
                              {room.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            style={{ color: colors.textMuted }}
                            onClick={() => openRoomModal(room)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            style={{ color: colors.error }}
                            onClick={() => setDeleteConfirm({ type: 'room', id: room.id, name: room.name })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Building Modal */}
      <Dialog open={isBuildingModalOpen} onOpenChange={setIsBuildingModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>
              {editingBuilding ? 'Edit Building' : 'Add New Building'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label style={{ color: colors.textSecondary }}>Name *</Label>
              <Input
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                placeholder="Building name"
                className="mt-1"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div>
              <Label style={{ color: colors.textSecondary }}>Code</Label>
              <Input
                value={buildingForm.code}
                onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })}
                placeholder="BLD-001"
                className="mt-1"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={buildingForm.isActive}
                onCheckedChange={(checked) => setBuildingForm({ ...buildingForm, isActive: checked })}
              />
              <Label style={{ color: colors.textSecondary }}>Active</Label>
            </div>
            <div className="col-span-2">
              <Label style={{ color: colors.textSecondary }}>Description</Label>
              <Textarea
                value={buildingForm.description}
                onChange={(e) => setBuildingForm({ ...buildingForm, description: e.target.value })}
                placeholder="Building description..."
                className="mt-1"
                rows={2}
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div className="col-span-2">
              <Label style={{ color: colors.textSecondary }}>Address</Label>
              <Input
                value={buildingForm.address}
                onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })}
                placeholder="Street address"
                className="mt-1"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div>
              <Label style={{ color: colors.textSecondary }}>City</Label>
              <Input
                value={buildingForm.city}
                onChange={(e) => setBuildingForm({ ...buildingForm, city: e.target.value })}
                placeholder="City"
                className="mt-1"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div>
              <Label style={{ color: colors.textSecondary }}>State/Province</Label>
              <Input
                value={buildingForm.state}
                onChange={(e) => setBuildingForm({ ...buildingForm, state: e.target.value })}
                placeholder="State"
                className="mt-1"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div>
              <Label style={{ color: colors.textSecondary }}>Country</Label>
              <Input
                value={buildingForm.country}
                onChange={(e) => setBuildingForm({ ...buildingForm, country: e.target.value })}
                placeholder="Country"
                className="mt-1"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div>
              <Label style={{ color: colors.textSecondary }}>Postal Code</Label>
              <Input
                value={buildingForm.postalCode}
                onChange={(e) => setBuildingForm({ ...buildingForm, postalCode: e.target.value })}
                placeholder="Postal code"
                className="mt-1"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
              onClick={() => setIsBuildingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: colors.primary, color: '#ffffff' }}
              onClick={saveBuilding}
              disabled={!buildingForm.name.trim() || isSaving}
            >
              {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingBuilding ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floor Modal */}
      <Dialog open={isFloorModalOpen} onOpenChange={setIsFloorModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>
              {editingFloor ? 'Edit Floor' : 'Add New Floor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label style={{ color: colors.textSecondary }}>Name *</Label>
              <Input
                value={floorForm.name}
                onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                placeholder="Floor name"
                className="mt-1"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ color: colors.textSecondary }}>Code</Label>
                <Input
                  value={floorForm.code}
                  onChange={(e) => setFloorForm({ ...floorForm, code: e.target.value })}
                  placeholder="FL-001"
                  className="mt-1"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textSecondary }}>Floor Number</Label>
                <Input
                  type="number"
                  value={floorForm.floorNumber}
                  onChange={(e) => setFloorForm({ ...floorForm, floorNumber: e.target.value })}
                  placeholder="1"
                  className="mt-1"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  }}
                />
              </div>
            </div>
            <div>
              <Label style={{ color: colors.textSecondary }}>Description</Label>
              <Textarea
                value={floorForm.description}
                onChange={(e) => setFloorForm({ ...floorForm, description: e.target.value })}
                placeholder="Floor description..."
                className="mt-1"
                rows={2}
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={floorForm.isActive}
                onCheckedChange={(checked) => setFloorForm({ ...floorForm, isActive: checked })}
              />
              <Label style={{ color: colors.textSecondary }}>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
              onClick={() => setIsFloorModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: colors.primary, color: '#ffffff' }}
              onClick={saveFloor}
              disabled={!floorForm.name.trim() || isSaving}
            >
              {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingFloor ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Modal */}
      <Dialog open={isRoomModalOpen} onOpenChange={setIsRoomModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label style={{ color: colors.textSecondary }}>Name *</Label>
              <Input
                value={roomForm.name}
                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                placeholder="Room name"
                className="mt-1"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ color: colors.textSecondary }}>Code</Label>
                <Input
                  value={roomForm.code}
                  onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })}
                  placeholder="RM-001"
                  className="mt-1"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textSecondary }}>Room Number</Label>
                <Input
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                  placeholder="101"
                  className="mt-1"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ color: colors.textSecondary }}>Room Type</Label>
                <Select
                  value={roomForm.roomType}
                  onValueChange={(value) => setRoomForm({ ...roomForm, roomType: value })}
                >
                  <SelectTrigger
                    className="mt-1"
                    style={{
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: roomForm.roomType ? colors.inputText : colors.textMuted,
                    }}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label style={{ color: colors.textSecondary }}>Capacity</Label>
                <Input
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                  placeholder="10"
                  className="mt-1"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  }}
                />
              </div>
            </div>
            <div>
              <Label style={{ color: colors.textSecondary }}>Description</Label>
              <Textarea
                value={roomForm.description}
                onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                placeholder="Room description..."
                className="mt-1"
                rows={2}
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={roomForm.isActive}
                onCheckedChange={(checked) => setRoomForm({ ...roomForm, isActive: checked })}
              />
              <Label style={{ color: colors.textSecondary }}>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
              onClick={() => setIsRoomModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: colors.primary, color: '#ffffff' }}
              onClick={saveRoom}
              disabled={!roomForm.name.trim() || isSaving}
            >
              {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingRoom ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: colors.text }}>Delete {deleteConfirm?.type}?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: colors.textMuted }}>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              {deleteConfirm?.type === 'building' && ' All associated floors and rooms will need to be deleted first.'}
              {deleteConfirm?.type === 'floor' && ' All associated rooms will need to be deleted first.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderColor: colors.border, color: colors.textSecondary }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              style={{ backgroundColor: colors.error, color: '#ffffff' }}
              onClick={() => {
                if (deleteConfirm?.type === 'building') {
                  deleteBuilding(deleteConfirm.id)
                } else if (deleteConfirm?.type === 'floor') {
                  deleteFloor(deleteConfirm.id)
                } else if (deleteConfirm?.type === 'room') {
                  deleteRoom(deleteConfirm.id)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
