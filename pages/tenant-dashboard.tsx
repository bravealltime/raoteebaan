import { Box, Heading, Text, Flex, Avatar, VStack, Icon, Badge, Card, CardHeader, CardBody, SimpleGrid, useToast, Button, Spinner, Center, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, AlertDialogCloseButton, useDisclosure, Table, Thead, Tbody, Tr, Th, Td, TableContainer } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit, updateDoc } from "firebase/firestore";
import MainLayout from "../components/MainLayout";
import { FaUser, FaHome, FaCalendarAlt, FaCreditCard, FaFileInvoice } from "react-icons/fa";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: string;
  roomId?: string;
  tenantId?: string;
  phoneNumber?: string;
  joinedDate?: string;
}

interface RoomData {
  id: string;
  tenantName: string;
  area: number;
  rent: number;
  service: number;
  electricity: number;
  water: number;
  latestTotal: number;
  billStatus: string;
  overdueDays: number;
}

interface BillHistory {
  id: string;
  month: string;
  year: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidDate?: string;
}

export default function TenantDashboard({ currentUser }) {
  
  
