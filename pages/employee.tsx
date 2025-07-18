import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Box, Flex, Heading, Text, Center, Spinner, Container, VStack, SimpleGrid } from "@chakra-ui/react";
import { FaUserFriends } from "react-icons/fa";
import AppHeader from "../components/AppHeader";
import Sidebar from "../components/Sidebar";
import { onAuthStateChanged } from "firebase/auth";
import MainLayout from "../components/MainLayout";
import AddAnnouncementCard from "../components/AddAnnouncementCard";
import AnnouncementsList from "../components/AnnouncementsList";

interface EmployeeProps {
  currentUser: any;
  role: string | null;
}

export default function Employee({ currentUser, role }: EmployeeProps) {
  const router = useRouter();

  
  if (role === null || !currentUser) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;
  
  return (
    <MainLayout role={role} currentUser={currentUser}>
      <Container maxW="container.xl" py={{ base: 4, md: 6 }}>
        <VStack spacing={6} align="stretch">
          <Heading>Employee Dashboard</Heading>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }} alignItems="start">
            <AddAnnouncementCard currentUser={currentUser} />
            <AnnouncementsList currentUser={currentUser} />
          </SimpleGrid>
        </VStack>
      </Container>
    </MainLayout>
  );
}