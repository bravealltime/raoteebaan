import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Avatar,
  Badge,
  IconButton,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Spinner,
  Center,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Link,
  Tooltip,
  Icon,
  Spacer,
  VStack,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  FaUserShield,
  FaUser,
  FaCrown,
  FaUserFriends,
  FaEdit,
  FaTrash,
  FaBan,
  FaPlus,
  FaEnvelope,
  FaUserTag,
  FaKey,
  FaSave,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaEllipsisV,
} from 'react-icons/fa';
import MainLayout from './MainLayout';

const AdminUsersContent = ({ currentUser, role, users, rooms, bills, search, setSearch, filter, setFilter, loading, isAddOpen, setIsAddOpen, addForm, setAddForm, addLoading, handleAddUser, isEditOpen, setIsEditOpen, editForm, setEditForm, editLoading, handleEditUser, handleEditClick, isConfirmBanOpen, setIsConfirmBanOpen, userToBan, handleBanUser, handleBanClick, isConfirmDeleteOpen, setIsConfirmDeleteOpen, userToDelete, handleDeleteUser, handleDeleteClick, isConfirmResetOpen, setIsConfirmResetOpen, userToReset, confirmResetPassword, handleResetPassword, showResetLink, setShowResetLink, resetLink, setResetLink, copyResetLink, closeResetLinkModal, handleStartConversation, StatBox, toast, isManagePermissionsOpen, setIsManagePermissionsOpen, modifiedRoles, setModifiedRoles, updatingRoleId, setUpdatingRoleId, permissionsCurrentPage, setPermissionsCurrentPage, PERMISSIONS_PER_PAGE }) => {
  const filteredUsers = users.filter(
    (user) =>
      (user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())) &&
      (filter ? user.role === filter : true)
  );

  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.role === 'admin').length;
  const ownerUsers = users.filter((u) => u.role === 'owner').length;
  const regularUsers = users.filter((u) => u.role === 'user').length;

  const permissionsPaginatedUsers = filteredUsers.slice(
    (permissionsCurrentPage - 1) * PERMISSIONS_PER_PAGE,
    permissionsCurrentPage * PERMISSIONS_PER_PAGE
  );

  const handleRoleChange = (userId, newRole) => {
    setModifiedRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleUpdateRole = async (userId) => {
    setUpdatingRoleId(userId);
    const newRole = modifiedRoles[userId];
    if (newRole) {
      try {
        // Update role in Firebase
        // This is a placeholder, you'll need to implement the actual logic
        console.log(`Updating user ${userId} to role ${newRole}`);
        toast({
          title: 'Role updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: 'Failed to update role',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setUpdatingRoleId(null);
        setModifiedRoles((prev) => {
          const newRoles = { ...prev };
          delete newRoles[userId];
          return newRoles;
        });
      }
    }
  };

  return (
    <MainLayout role={role} currentUser={currentUser}>
      <Box p={{ base: 4, md: 8 }}>
        <Heading as="h1" size="xl" mb={6} color="gray.700">
          <Icon as={FaUserFriends} mr={3} color="blue.500" />
          จัดการผู้ใช้
        </Heading>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="md" mb={8}>
          <Heading as="h2" size="md" mb={4} color="gray.600">ภาพรวมผู้ใช้</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <StatBox icon={FaUserFriends} label="ผู้ใช้ทั้งหมด" value={totalUsers} color="purple.500" />
            <StatBox icon={FaCrown} label="แอดมิน" value={adminUsers} color="orange.500" />
            <StatBox icon={FaUserShield} label="เจ้าของ" value={ownerUsers} color="green.500" />
            <StatBox icon={FaUser} label="ผู้ใช้ทั่วไป" value={regularUsers} color="blue.500" />
          </SimpleGrid>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="md" mb={8}>
          <Flex mb={6} gap={4} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
            <Input
              placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              flex="1"
              maxW={{ md: '300px' }}
              size="md"
              borderRadius="md"
            />
            <Select
              placeholder="กรองตามบทบาท"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              maxW={{ md: '200px' }}
              size="md"
              borderRadius="md"
            >
              <option value="admin">แอดมิน</option>
              <option value="owner">เจ้าของ</option>
              <option value="user">ผู้ใช้</option>
            </Select>
            <Spacer />
            <HStack spacing={3}>
              <Button
                leftIcon={<FaPlus />}
                colorScheme="teal"
                onClick={() => setIsAddOpen(true)}
                size="md"
                borderRadius="md"
              >
                เพิ่มผู้ใช้ใหม่
              </Button>
              <Button
                leftIcon={<FaUserTag />}
                colorScheme="blue"
                onClick={() => setIsManagePermissionsOpen(true)}
                size="md"
                borderRadius="md"
              >
                จัดการสิทธิ์
              </Button>
            </HStack>
          </Flex>

          {loading ? (
            <Center py={10}><Spinner size="xl" color="blue.500" /></Center>
          ) : (
            <Box overflowX="auto" style={{ overflow: 'visible' }}>
              <Table variant="simple" size="md">
                <Thead bg="gray.50">
                  <Tr>
                    <Th py={3}>ผู้ใช้</Th>
                    <Th py={3}>บทบาท</Th>
                    <Th py={3}>สถานะ</Th>
                    <Th py={3}>ห้อง</Th>
                    <Th py={3} textAlign="center">การกระทำ</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredUsers.length === 0 ? (
                    <Tr>
                      <Td colSpan={5} textAlign="center" py={5}>
                        <Text color="gray.500">ไม่พบผู้ใช้</Text>
                      </Td>
                    </Tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <Tr key={user.id}>
                        <Td>
                          <Flex align="center">
                            <Avatar size="sm" name={user.name} src={user.avatar} mr={3} />
                            <Box>
                              <Text fontWeight="bold" fontSize="sm">{user.name}</Text>
                              <Text fontSize="xs" color="gray.500">{user.email}</Text>
                            </Box>
                          </Flex>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              user.role === 'admin'
                                ? 'purple'
                                : user.role === 'owner'
                                ? 'green'
                                : 'blue'
                            }
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            {user.role}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={user.status === 'active' ? 'green' : 'red'}
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            {user.status}
                          </Badge>
                        </Td>
                        <Td>
                          {user.roomId ? (
                            <Link href={`/bill/${user.roomId}`} color="teal.500" isExternal>
                              {user.roomNumber || user.roomId}
                            </Link>
                          ) : (
                            <Text color="gray.400">N/A</Text>
                          )}
                        </Td>
                        <Td textAlign="center">
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              icon={<FaEllipsisV />}
                              variant="ghost"
                              size="sm"
                              aria-label="User actions"
                            />
                            <MenuList portal={true} zIndex={20000}>
                              <MenuItem icon={<FaEdit />} onClick={() => handleEditClick(user)}>
                                แก้ไข
                              </MenuItem>
                              <MenuItem icon={<FaBan />} onClick={() => handleBanClick(user)}>
                                ระงับ
                              </MenuItem>
                              <MenuItem icon={<FaTrash />} onClick={() => handleDeleteClick(user)}>
                                ลบ
                              </MenuItem>
                              <MenuItem icon={<FaEnvelope />} onClick={() => handleStartConversation(user)}>
                                ส่งข้อความ
                              </MenuItem>
                              <MenuItem icon={<FaKey />} onClick={() => handleResetPassword(user)}>
                                รีเซ็ตรหัสผ่าน
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </Box>

      {/* Add User Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>เพิ่มผู้ใช้ใหม่</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired mb={4}>
              <FormLabel>ชื่อ</FormLabel>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              />
            </FormControl>
            <FormControl isRequired mb={4}>
              <FormLabel>อีเมล</FormLabel>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              />
            </FormControl>
            <FormControl isRequired mb={4}>
              <FormLabel>บทบาท</FormLabel>
              <Select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              >
                <option value="user">ผู้ใช้</option>
                <option value="owner">เจ้าของ</option>
                <option value="admin">แอดมิน</option>
              </Select>
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>ห้อง (ถ้ามี)</FormLabel>
              <Select
                placeholder="เลือกห้อง"
                value={addForm.roomId}
                onChange={(e) => setAddForm({ ...addForm, roomId: e.target.value })}
              >
                {rooms
                  .filter((room) => room.status === 'vacant')
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      ห้อง {room.id}
                    </option>
                  ))}
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              colorScheme="teal"
              onClick={handleAddUser}
              isLoading={addLoading}
            >
              เพิ่มผู้ใช้
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User Modal */}
      {editForm && (
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>แก้ไขข้อมูลผู้ใช้</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl mb={4}>
                <FormLabel>ชื่อ</FormLabel>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>อีเมล</FormLabel>
                <Input type="email" value={editForm.email} isReadOnly />
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>บทบาท</FormLabel>
                <Select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="user">ผู้ใช้</option>
                  <option value="owner">เจ้าของ</option>
                  <option value="admin">แอดมิน</option>
                </Select>
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>สถานะ</FormLabel>
                <Select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="active">ใช้งาน</option>
                  <option value="inactive">ไม่ใช้งาน</option>
                </Select>
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => setIsEditOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                colorScheme="teal"
                onClick={handleEditUser}
                isLoading={editLoading}
              >
                บันทึก
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Confirmation Modals (Ban, Delete, Reset Password) */}
      <Modal isOpen={isConfirmBanOpen} onClose={() => setIsConfirmBanOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ยืนยันการระงับผู้ใช้</ModalHeader>
          <ModalBody>
            <Text>คุณแน่ใจหรือไม่ว่าต้องการระงับผู้ใช้ {userToBan?.name}?</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsConfirmBanOpen(false)}>
              ยกเลิก
            </Button>
            <Button colorScheme="red" onClick={handleBanUser}>
              ยืนยัน
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ยืนยันการลบผู้ใช้</ModalHeader>
          <ModalBody>
            <Text>คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ {userToDelete?.name}? การกระทำนี้ไม่สามารถย้อนกลับได้</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsConfirmDeleteOpen(false)}>
              ยกเลิก
            </Button>
            <Button colorScheme="red" onClick={handleDeleteUser}>
              ยืนยัน
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isConfirmResetOpen} onClose={() => setIsConfirmResetOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ยืนยันการรีเซ็ตรหัสผ่าน</ModalHeader>
          <ModalBody>
            <Text>คุณแน่ใจหรือไม่ว่าต้องการส่งอีเมลรีเซ็ตรหัสผ่านสำหรับผู้ใช้ {userToReset?.name}?</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsConfirmResetOpen(false)}>
              ยกเลิก
            </Button>
            <Button colorScheme="orange" onClick={confirmResetPassword}>
              ยืนยัน
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Show Reset Link Modal */}
      <Modal isOpen={showResetLink} onClose={closeResetLinkModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ลิงก์สำหรับตั้งรหัสผ่าน</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="success" mb={4}>
              <AlertIcon />
              <Box flex="1">
                <AlertTitle>ผู้ใช้ถูกสร้างเรียบร้อยแล้ว!</AlertTitle>
                <AlertDescription>
                  กรุณาส่งลิงก์นี้ให้ผู้ใช้เพื่อตั้งรหัสผ่าน ลิงก์นี้จะแสดงเพียงครั้งเดียว
                </AlertDescription>
              </Box>
            </Alert>
            <Input value={resetLink || ''} isReadOnly />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={copyResetLink}>
              คัดลอกลิงก์
            </Button>
            <Button variant="ghost" onClick={closeResetLinkModal}>
              ปิด
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Manage Permissions Modal */}
      <Modal isOpen={isManagePermissionsOpen} onClose={() => setIsManagePermissionsOpen(false)} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>จัดการสิทธิ์ผู้ใช้</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>ผู้ใช้</Th>
                    <Th>บทบาทปัจจุบัน</Th>
                    <Th>บทบาทใหม่</Th>
                    <Th>การกระทำ</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {permissionsPaginatedUsers.map((user) => (
                    <Tr key={user.id}>
                      <Td>
                        <Text fontWeight="bold">{user.name}</Text>
                        <Text fontSize="sm" color="gray.500">{user.email}</Text>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            user.role === 'admin'
                              ? 'orange'
                              : user.role === 'owner'
                              ? 'green'
                              : 'blue'
                          }
                        >
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>
                        <Select
                          value={modifiedRoles[user.id] || user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          isDisabled={updatingRoleId === user.id}
                        >
                          <option value="user">ผู้ใช้</option>
                          <option value="owner">เจ้าของ</option>
                          <option value="admin">แอดมิน</option>
                        </Select>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          colorScheme="teal"
                          leftIcon={<FaSave />}
                          isLoading={updatingRoleId === user.id}
                          isDisabled={!modifiedRoles[user.id] || modifiedRoles[user.id] === user.role}
                          onClick={() => handleUpdateRole(user.id)}
                        >
                          บันทึก
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            <Flex justifyContent="center" mt={4}>
              <IconButton
                aria-label="Previous page"
                icon={<FaChevronLeft />}
                onClick={() => setPermissionsCurrentPage((p) => Math.max(1, p - 1))}
                isDisabled={permissionsCurrentPage === 1}
                mr={2}
              />
              <Text alignSelf="center">
                Page {permissionsCurrentPage} of {Math.ceil(filteredUsers.length / PERMISSIONS_PER_PAGE)}
              </Text>
              <IconButton
                aria-label="Next page"
                icon={<FaChevronRight />}
                onClick={() => setPermissionsCurrentPage((p) => Math.min(p + 1, Math.ceil(filteredUsers.length / PERMISSIONS_PER_PAGE)))}
                isDisabled={permissionsCurrentPage >= Math.ceil(filteredUsers.length / PERMISSIONS_PER_PAGE)}
                ml={2}
              />
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsManagePermissionsOpen(false)}>ปิด</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MainLayout>
  );
};

export default AdminUsersContent;