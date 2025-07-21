--
-- PostgreSQL database dump
--

-- Dumped from database version 17.1
-- Dumped by pg_dump version 17.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: archive; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA archive;


ALTER SCHEMA archive OWNER TO postgres;

--
-- Name: assessment; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA assessment;


ALTER SCHEMA assessment OWNER TO postgres;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO postgres;

--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cleanup_expired_idempotency_cache(); Type: FUNCTION; Schema: assessment; Owner: postgres
--

CREATE FUNCTION assessment.cleanup_expired_idempotency_cache() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM assessment.idempotency_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION assessment.cleanup_expired_idempotency_cache() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analysis_jobs; Type: TABLE; Schema: archive; Owner: postgres
--

CREATE TABLE archive.analysis_jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    status character varying(50) DEFAULT 'queued'::character varying NOT NULL,
    result_id uuid,
    error_message text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assessment_name character varying(255) DEFAULT 'AI-Driven Talent Mapping'::character varying NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    processing_started_at timestamp with time zone,
    CONSTRAINT analysis_jobs_assessment_name_check CHECK (((assessment_name)::text = ANY ((ARRAY['AI-Driven Talent Mapping'::character varying, 'AI-Based IQ Test'::character varying, 'Custom Assessment'::character varying])::text[]))),
    CONSTRAINT analysis_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE archive.analysis_jobs OWNER TO postgres;

--
-- Name: analysis_results; Type: TABLE; Schema: archive; Owner: postgres
--

CREATE TABLE archive.analysis_results (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    assessment_data jsonb,
    persona_profile jsonb,
    status character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assessment_name character varying(255) DEFAULT 'AI-Driven Talent Mapping'::character varying NOT NULL,
    CONSTRAINT analysis_results_assessment_name_check CHECK (((assessment_name)::text = ANY ((ARRAY['AI-Driven Talent Mapping'::character varying, 'AI-Based IQ Test'::character varying, 'Custom Assessment'::character varying])::text[]))),
    CONSTRAINT analysis_results_status_check CHECK (((status)::text = ANY ((ARRAY['completed'::character varying, 'processing'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE archive.analysis_results OWNER TO postgres;

--
-- Name: idempotency_cache; Type: TABLE; Schema: assessment; Owner: postgres
--

CREATE TABLE assessment.idempotency_cache (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    request_hash character varying(64) NOT NULL,
    response_data jsonb NOT NULL,
    status_code integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE assessment.idempotency_cache OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.user_profiles (
    user_id uuid NOT NULL,
    full_name character varying(100),
    date_of_birth date,
    gender character varying(10),
    school_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_profiles_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying])::text[])))
);


ALTER TABLE auth.user_profiles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(100),
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    user_type character varying(20) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    token_balance integer DEFAULT 0 NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_token_balance_check CHECK ((token_balance >= 0)),
    CONSTRAINT users_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'superadmin'::character varying, 'moderator'::character varying])::text[])))
);


ALTER TABLE auth.users OWNER TO postgres;

--
-- Name: schools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schools (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    address text,
    city character varying(100),
    province character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.schools OWNER TO postgres;

--
-- Name: schools_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schools_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schools_id_seq OWNER TO postgres;

--
-- Name: schools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schools_id_seq OWNED BY public.schools.id;


--
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Data for Name: analysis_jobs; Type: TABLE DATA; Schema: archive; Owner: postgres
--

COPY archive.analysis_jobs (id, job_id, user_id, status, result_id, error_message, completed_at, created_at, updated_at, assessment_name, priority, retry_count, max_retries, processing_started_at) FROM stdin;
\.


--
-- Data for Name: analysis_results; Type: TABLE DATA; Schema: archive; Owner: postgres
--

COPY archive.analysis_results (id, user_id, assessment_data, persona_profile, status, error_message, created_at, updated_at, assessment_name) FROM stdin;
\.


--
-- Data for Name: idempotency_cache; Type: TABLE DATA; Schema: assessment; Owner: postgres
--

COPY assessment.idempotency_cache (id, idempotency_key, user_id, request_hash, response_data, status_code, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.user_profiles (user_id, full_name, date_of_birth, gender, school_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.users (id, username, email, password_hash, user_type, is_active, token_balance, last_login, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schools; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schools (id, name, address, city, province, created_at) FROM stdin;
\.


--
-- Name: schools_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schools_id_seq', 1, false);


--
-- Name: analysis_jobs analysis_jobs_job_id_key; Type: CONSTRAINT; Schema: archive; Owner: postgres
--

ALTER TABLE ONLY archive.analysis_jobs
    ADD CONSTRAINT analysis_jobs_job_id_key UNIQUE (job_id);


--
-- Name: analysis_jobs analysis_jobs_pkey; Type: CONSTRAINT; Schema: archive; Owner: postgres
--

ALTER TABLE ONLY archive.analysis_jobs
    ADD CONSTRAINT analysis_jobs_pkey PRIMARY KEY (id);


--
-- Name: analysis_results analysis_results_pkey; Type: CONSTRAINT; Schema: archive; Owner: postgres
--

ALTER TABLE ONLY archive.analysis_results
    ADD CONSTRAINT analysis_results_pkey PRIMARY KEY (id);


--
-- Name: idempotency_cache idempotency_cache_idempotency_key_key; Type: CONSTRAINT; Schema: assessment; Owner: postgres
--

ALTER TABLE ONLY assessment.idempotency_cache
    ADD CONSTRAINT idempotency_cache_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: idempotency_cache idempotency_cache_pkey; Type: CONSTRAINT; Schema: assessment; Owner: postgres
--

ALTER TABLE ONLY assessment.idempotency_cache
    ADD CONSTRAINT idempotency_cache_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: idx_analysis_jobs_assessment_name; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_jobs_assessment_name ON archive.analysis_jobs USING btree (assessment_name);


--
-- Name: idx_analysis_jobs_created_at; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_jobs_created_at ON archive.analysis_jobs USING btree (created_at);


--
-- Name: idx_analysis_jobs_job_id; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE UNIQUE INDEX idx_analysis_jobs_job_id ON archive.analysis_jobs USING btree (job_id);


--
-- Name: idx_analysis_jobs_queue_processing; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_jobs_queue_processing ON archive.analysis_jobs USING btree (status, priority, created_at);


--
-- Name: idx_analysis_jobs_retry_logic; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_jobs_retry_logic ON archive.analysis_jobs USING btree (status, retry_count, max_retries);


--
-- Name: idx_analysis_jobs_status; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_jobs_status ON archive.analysis_jobs USING btree (status);


--
-- Name: idx_analysis_jobs_user_id; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_jobs_user_id ON archive.analysis_jobs USING btree (user_id);


--
-- Name: idx_analysis_jobs_user_status; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_jobs_user_status ON archive.analysis_jobs USING btree (user_id, status);


--
-- Name: idx_analysis_jobs_user_status_created; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_jobs_user_status_created ON archive.analysis_jobs USING btree (user_id, status, created_at);


--
-- Name: idx_analysis_results_archetype_assessment; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_archetype_assessment ON archive.analysis_results USING btree (((persona_profile ->> 'archetype'::text)), assessment_name);


--
-- Name: idx_analysis_results_archetype_status_created; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_archetype_status_created ON archive.analysis_results USING btree (((persona_profile ->> 'archetype'::text)), status, created_at);


--
-- Name: idx_analysis_results_assessment_data_gin; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_assessment_data_gin ON archive.analysis_results USING gin (assessment_data);


--
-- Name: idx_analysis_results_assessment_name; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_assessment_name ON archive.analysis_results USING btree (assessment_name);


--
-- Name: idx_analysis_results_assessment_name_optimized; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_assessment_name_optimized ON archive.analysis_results USING btree (assessment_name);


--
-- Name: idx_analysis_results_created_at; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_created_at ON archive.analysis_results USING btree (created_at);


--
-- Name: idx_analysis_results_persona_profile_gin; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_persona_profile_gin ON archive.analysis_results USING gin (persona_profile);


--
-- Name: idx_analysis_results_status; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_status ON archive.analysis_results USING btree (status);


--
-- Name: idx_analysis_results_status_created; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_status_created ON archive.analysis_results USING btree (status, created_at);


--
-- Name: idx_analysis_results_user_created; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_user_created ON archive.analysis_results USING btree (user_id, created_at);


--
-- Name: idx_analysis_results_user_id; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_user_id ON archive.analysis_results USING btree (user_id);


--
-- Name: idx_analysis_results_user_status; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_user_status ON archive.analysis_results USING btree (user_id, status);


--
-- Name: idx_analysis_results_user_status_created; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_analysis_results_user_status_created ON archive.analysis_results USING btree (user_id, status, created_at);


--
-- Name: idx_persona_profile_archetype; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_persona_profile_archetype ON archive.analysis_results USING gin (((persona_profile ->> 'archetype'::text)));


--
-- Name: idx_persona_profile_career_recommendations; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_persona_profile_career_recommendations ON archive.analysis_results USING gin (((persona_profile -> 'careerRecommendations'::text)));


--
-- Name: idx_persona_profile_ocean; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_persona_profile_ocean ON archive.analysis_results USING gin (((persona_profile -> 'ocean'::text)));


--
-- Name: idx_persona_profile_riasec; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_persona_profile_riasec ON archive.analysis_results USING gin (((persona_profile -> 'riasec'::text)));


--
-- Name: idx_persona_profile_risk_tolerance; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_persona_profile_risk_tolerance ON archive.analysis_results USING gin (((persona_profile ->> 'riskTolerance'::text)));


--
-- Name: idx_persona_profile_strengths; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_persona_profile_strengths ON archive.analysis_results USING gin (((persona_profile -> 'strengths'::text)));


--
-- Name: idx_persona_profile_weaknesses; Type: INDEX; Schema: archive; Owner: postgres
--

CREATE INDEX idx_persona_profile_weaknesses ON archive.analysis_results USING gin (((persona_profile -> 'weaknesses'::text)));


--
-- Name: idx_idempotency_cache_expires_at; Type: INDEX; Schema: assessment; Owner: postgres
--

CREATE INDEX idx_idempotency_cache_expires_at ON assessment.idempotency_cache USING btree (expires_at);


--
-- Name: idx_idempotency_cache_key; Type: INDEX; Schema: assessment; Owner: postgres
--

CREATE INDEX idx_idempotency_cache_key ON assessment.idempotency_cache USING btree (idempotency_key);


--
-- Name: idx_idempotency_cache_user_id; Type: INDEX; Schema: assessment; Owner: postgres
--

CREATE INDEX idx_idempotency_cache_user_id ON assessment.idempotency_cache USING btree (user_id);


--
-- Name: idx_user_profiles_created_at; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_user_profiles_created_at ON auth.user_profiles USING btree (created_at);


--
-- Name: idx_user_profiles_school_id; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_user_profiles_school_id ON auth.user_profiles USING btree (school_id);


--
-- Name: idx_user_profiles_school_id_idx; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_user_profiles_school_id_idx ON auth.user_profiles USING btree (school_id);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_user_profiles_user_id ON auth.user_profiles USING btree (user_id);


--
-- Name: idx_users_admin_lookup; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_users_admin_lookup ON auth.users USING btree (user_type, is_active, email);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_users_created_at ON auth.users USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_users_is_active ON auth.users USING btree (is_active);


--
-- Name: idx_users_user_type; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_users_user_type ON auth.users USING btree (user_type);


--
-- Name: idx_users_username; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_username ON auth.users USING btree (username) WHERE (username IS NOT NULL);


--
-- Name: idx_schools_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_city ON public.schools USING btree (city);


--
-- Name: idx_schools_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_created_at ON public.schools USING btree (created_at);


--
-- Name: idx_schools_full_info; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_full_info ON public.schools USING btree (name, city, province);


--
-- Name: idx_schools_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_location ON public.schools USING btree (province, city);


--
-- Name: idx_schools_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_name ON public.schools USING btree (name);


--
-- Name: idx_schools_province; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_province ON public.schools USING btree (province);


--
-- Name: analysis_jobs update_analysis_jobs_updated_at; Type: TRIGGER; Schema: archive; Owner: postgres
--

CREATE TRIGGER update_analysis_jobs_updated_at BEFORE UPDATE ON archive.analysis_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: analysis_results update_analysis_results_updated_at; Type: TRIGGER; Schema: archive; Owner: postgres
--

CREATE TRIGGER update_analysis_results_updated_at BEFORE UPDATE ON archive.analysis_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profiles update_user_profiles_updated_at; Type: TRIGGER; Schema: auth; Owner: postgres
--

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON auth.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: auth; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profiles user_profiles_school_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_profiles
    ADD CONSTRAINT user_profiles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA archive; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA archive TO PUBLIC;


--
-- Name: SCHEMA assessment; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA assessment TO PUBLIC;


--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA auth TO PUBLIC;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO atma_user;


--
-- Name: TABLE analysis_jobs; Type: ACL; Schema: archive; Owner: postgres
--

GRANT ALL ON TABLE archive.analysis_jobs TO PUBLIC;


--
-- Name: TABLE analysis_results; Type: ACL; Schema: archive; Owner: postgres
--

GRANT ALL ON TABLE archive.analysis_results TO PUBLIC;


--
-- Name: TABLE idempotency_cache; Type: ACL; Schema: assessment; Owner: postgres
--

GRANT SELECT ON TABLE assessment.idempotency_cache TO atma_user;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: auth; Owner: postgres
--

GRANT ALL ON TABLE auth.user_profiles TO PUBLIC;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: postgres
--

GRANT ALL ON TABLE auth.users TO PUBLIC;


--
-- Name: TABLE schools; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.schools TO atma_user;
GRANT ALL ON TABLE public.schools TO PUBLIC;


--
-- Name: SEQUENCE schools_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.schools_id_seq TO atma_user;
GRANT ALL ON SEQUENCE public.schools_id_seq TO PUBLIC;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO atma_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO atma_user;


--
-- PostgreSQL database dump complete
--

