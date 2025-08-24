import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  PersonAdd,
  Security,
  CheckCircle,
  Add,
  Delete,
} from '@mui/icons-material';

interface IdentityAttribute {
  name: string;
  value: string;
  type: 'public' | 'private';
}

const CreateIdentity: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [attributes, setAttributes] = useState<IdentityAttribute[]>([
    { name: 'firstName', value: '', type: 'public' },
    { name: 'lastName', value: '', type: 'public' },
    { name: 'dateOfBirth', value: '', type: 'private' },
    { name: 'email', value: '', type: 'private' },
  ]);
  const [did, setDid] = useState('');

  const steps = ['Basic Information', 'Privacy Settings', 'Blockchain Registration'];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleAttributeChange = (index: number, field: keyof IdentityAttribute, value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index] = { ...newAttributes[index], [field]: value };
    setAttributes(newAttributes);
  };

  const addAttribute = () => {
    setAttributes([...attributes, { name: '', value: '', type: 'private' }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleCreateIdentity = async () => {
    setLoading(true);
    // Simulate blockchain transaction
    setTimeout(() => {
      setDid(`did:eth:0x${Math.random().toString(16).substr(2, 40)}`);
      setLoading(false);
      handleNext();
    }, 3000);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Enter Your Identity Attributes
            </Typography>
            <Grid container spacing={2}>
              {attributes.map((attr, index) => (
                <Grid item xs={12} key={index}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="Attribute Name"
                      value={attr.name}
                      onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Value"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                      size="small"
                      sx={{ flex: 2 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={attr.type}
                        label="Type"
                        onChange={(e) => handleAttributeChange(index, 'type', e.target.value)}
                      >
                        <MenuItem value="public">Public</MenuItem>
                        <MenuItem value="private">Private</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      color="error"
                      onClick={() => removeAttribute(index)}
                      disabled={attributes.length <= 1}
                    >
                      <Delete />
                    </Button>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Button
              startIcon={<Add />}
              onClick={addAttribute}
              sx={{ mt: 2 }}
              variant="outlined"
            >
              Add Attribute
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Configure Privacy Settings
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Private attributes will be encrypted and only revealed through zero-knowledge proofs
            </Alert>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: '#0f172a' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Public Attributes
                  </Typography>
                  {attributes
                    .filter((attr) => attr.type === 'public')
                    .map((attr, index) => (
                      <Chip
                        key={index}
                        label={`${attr.name}: ${attr.value}`}
                        sx={{ m: 0.5 }}
                        color="primary"
                      />
                    ))}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: '#0f172a' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Private Attributes
                  </Typography>
                  {attributes
                    .filter((attr) => attr.type === 'private')
                    .map((attr, index) => (
                      <Chip
                        key={index}
                        label={`${attr.name}: ***`}
                        sx={{ m: 0.5 }}
                        color="secondary"
                        icon={<Security />}
                      />
                    ))}
                </Paper>
              </Grid>
            </Grid>
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Privacy Features:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip label="Zero-Knowledge Proofs" size="small" />
                <Chip label="Selective Disclosure" size="small" />
                <Chip label="Encrypted Storage" size="small" />
                <Chip label="Homomorphic Encryption" size="small" />
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Register on Blockchain
            </Typography>
            {loading ? (
              <Box>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography variant="body1">
                  Creating your decentralized identity...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This may take a few moments
                </Typography>
              </Box>
            ) : (
              <Box>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  This will create an immutable record on the blockchain. 
                  Make sure all information is correct.
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleCreateIdentity}
                  startIcon={<PersonAdd />}
                >
                  Create Identity
                </Button>
              </Box>
            )}
          </Box>
        );

      case 3:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 80, color: '#10b981', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2 }}>
              Identity Created Successfully!
            </Typography>
            <Paper sx={{ p: 3, bgcolor: '#0f172a', mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Your Decentralized Identifier (DID)
              </Typography>
              <Typography variant="h6" sx={{ wordBreak: 'break-all', mt: 1 }}>
                {did}
              </Typography>
            </Paper>
            <Button variant="contained" href="/credentials">
              Manage Credentials
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
          Create Digital Identity
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0 || activeStep === 3}
            onClick={handleBack}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === 2 || activeStep === 3}
          >
            {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateIdentity;