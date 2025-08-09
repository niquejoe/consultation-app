import React from "react";
import {
  ChakraProvider,
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Input
} from "@chakra-ui/react";

import { FormControl, FormLabel } from "@chakra-ui/form-control";

function App() {
  return (
    <ChakraProvider>
      <Box p={8} maxW="400px" mx="auto" mt={10} borderWidth="1px" borderRadius="lg">
        <VStack spacing={4} align="stretch">
          <Heading as="h1" size="lg" textAlign="center">
            Consultation Form
          </Heading>
          <Text textAlign="center" color="gray.600">
            Please fill out your details
          </Text>

          <FormControl>
            <FormLabel>Name</FormLabel>
            <Input placeholder="Enter your name" />
          </FormControl>

          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input type="email" placeholder="Enter your email" />
          </FormControl>

          <Button colorScheme="teal" type="submit">
            Submit
          </Button>
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App;
